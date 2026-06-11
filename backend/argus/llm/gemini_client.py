"""Gemini client with explicit fallback chain and circuit breaker.

The chain is (in order):

1. ``ARGUS_LLM_MODEL_PRIMARY`` (default: ``gemini-3-flash-preview``)
2. ``ARGUS_LLM_MODEL_FALLBACK`` (default: ``gemini-2.5-flash``)
3. ``ARGUS_LLM_MODEL_LAST_RESORT`` (default: ``gemini-2.5-flash-lite``)

If a model returns 3 errors within 60 seconds (configurable), the
circuit breaker opens and we skip that model for the rest of the
window. The next call tries the next model in the chain. After the
window expires, we try the first model again.

The client is a thin wrapper over ``google-generativeai``. The
import is lazy because the SDK is only required if Gemini is the
configured provider (it's the only provider in v1, so the import is
effectively always required, but lazy-loading keeps the
``pip install`` smaller for tests that don't use Gemini).
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from collections import deque
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any

from argus.config import settings
from argus.guard.result_set_guard import redact_connection_string

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Circuit breaker
# ---------------------------------------------------------------------------


@dataclass
class _Circuit:
    """Tracks recent errors per model so we can skip a flaky one."""

    model_name: str
    window_s: float
    threshold: int
    error_times: deque[float] = field(default_factory=deque)
    opened_at: float | None = None

    def record_error(self, now: float) -> None:
        self.error_times.append(now)
        self._evict_old(now)
        if len(self.error_times) >= self.threshold:
            self.opened_at = now

    def record_success(self) -> None:
        self.error_times.clear()
        self.opened_at = None

    def is_open(self, now: float) -> bool:
        if self.opened_at is None:
            return False
        if now - self.opened_at >= self.window_s:
            # Window expired — half-open.
            self.opened_at = None
            self.error_times.clear()
            return False
        return True

    def _evict_old(self, now: float) -> None:
        cutoff = now - self.window_s
        while self.error_times and self.error_times[0] < cutoff:
            self.error_times.popleft()


# ---------------------------------------------------------------------------
# Gemini client
# ---------------------------------------------------------------------------


class GeminiClient:
    """Async wrapper around ``google-generativeai`` with a fallback chain."""

    def __init__(
        self,
        *,
        api_key: str | None = None,
        primary: str | None = None,
        fallback: str | None = None,
        last_resort: str | None = None,
        circuit_window_s: int | None = None,
        circuit_threshold: int | None = None,
    ) -> None:
        self._api_key = api_key or settings.gemini_api_key
        self._model_names = [
            primary or settings.llm_model_primary,
            fallback or settings.llm_model_fallback,
            last_resort or settings.llm_model_last_resort,
        ]
        self._circuits = {
            name: _Circuit(
                model_name=name,
                window_s=circuit_window_s or settings.llm_circuit_window_s,
                threshold=circuit_threshold or settings.llm_circuit_threshold,
            )
            for name in self._model_names
        }
        self._models: dict[str, Any] = {}
        self._configured = False

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        max_output_tokens: int = 1024,
        temperature: float = 0.2,
    ) -> str:
        """Generate a completion. Returns the model's text output.

        Tries the primary model first. On error, opens the circuit and
        tries the next model. Returns the first successful output, or
        raises ``RuntimeError`` if all models fail.
        """
        last_error: Exception | None = None
        for name in self._candidate_models():
            try:
                text = await self._call_generate(
                    name,
                    prompt,
                    system=system,
                    max_output_tokens=max_output_tokens,
                    temperature=temperature,
                )
                self._circuits[name].record_success()
                return text
            except Exception as exc:
                logger.warning("gemini model %s failed: %s", name, exc)
                self._circuits[name].record_error(time.monotonic())
                last_error = exc
        raise RuntimeError(f"All Gemini models failed: {last_error!s}")

    async def generate_stream(
        self,
        prompt: str,
        *,
        system: str | None = None,
        max_output_tokens: int = 1024,
        temperature: float = 0.2,
    ) -> AsyncIterator[str]:
        """Stream a completion. Yields text chunks.

        On the first failure, falls back to the next model. If all
        models fail, raises ``RuntimeError`` after exhausting the chain.
        """
        for name in self._candidate_models():
            try:
                async for chunk in self._call_stream(
                    name,
                    prompt,
                    system=system,
                    max_output_tokens=max_output_tokens,
                    temperature=temperature,
                ):
                    yield chunk
                self._circuits[name].record_success()
                return
            except Exception as exc:
                logger.warning("gemini model %s (stream) failed: %s", name, exc)
                self._circuits[name].record_error(time.monotonic())

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _candidate_models(self) -> list[str]:
        now = time.monotonic()
        return [n for n in self._model_names if not self._circuits[n].is_open(now)]

    def _ensure_configured(self) -> None:
        if self._configured:
            return
        if not self._api_key:
            raise RuntimeError("GEMINI_API_KEY is not set")
        # Lazy import — keeps tests light.
        from google import genai
          # type: ignore[import-untyped]

        genai.configure(api_key=self._api_key)
        for name in self._model_names:
            self._models[name] = genai.GenerativeModel(name)
        self._configured = True

    async def _call_generate(
        self,
        name: str,
        prompt: str,
        *,
        system: str | None,
        max_output_tokens: int,
        temperature: float,
    ) -> str:
        self._ensure_configured()
        model = self._models[name]
        full_prompt = f"{system}\n\n{prompt}" if system else prompt

        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(
            None,
            lambda: model.generate_content(
                full_prompt,
                generation_config={
                    "max_output_tokens": max_output_tokens,
                    "temperature": temperature,
                },
            ),
        )
        return response.text or ""

    async def _call_stream(
        self,
        name: str,
        prompt: str,
        *,
        system: str | None,
        max_output_tokens: int,
        temperature: float,
    ) -> AsyncIterator[str]:
        self._ensure_configured()
        model = self._models[name]
        full_prompt = f"{system}\n\n{prompt}" if system else prompt

        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(
            None,
            lambda: model.generate_content(
                full_prompt,
                generation_config={
                    "max_output_tokens": max_output_tokens,
                    "temperature": temperature,
                },
                stream=True,
            ),
        )
        for chunk in response:
            text = getattr(chunk, "text", None)
            if text:
                yield text


# ---------------------------------------------------------------------------
# Planner
# ---------------------------------------------------------------------------


class Planner:
    """The planner LLM call. Wraps ``GeminiClient.generate`` and
    parses the JSON response into a list of plan steps.

    The planner is a thin layer; the heavy lifting is in the
    ``planner_system_prompt`` and ``build_planner_prompt`` helpers
    in ``argus.llm.prompts``.
    """

    def __init__(self, client: GeminiClient | None = None) -> None:
        self._client = client or GeminiClient()

    async def plan(self, sampled_schema: dict) -> list[dict[str, Any]]:
        """Run the planner and return a list of plan-step dicts.

        Each step has ``module``, ``collection``, ``params``. We do
        not validate the LLM's output here — the API endpoint's
        ``PlanRequest`` schema enforces the shape.
        """
        from argus.llm.prompts import build_planner_prompt, planner_system_prompt

        system = planner_system_prompt()
        prompt = build_planner_prompt(sampled_schema)
        raw = await self._client.generate(
            prompt,
            system=system,
            max_output_tokens=1024,
            temperature=0.0,
        )
        return _parse_planner_json(raw)


def _parse_planner_json(raw: str) -> list[dict[str, Any]]:
    """Parse the planner's JSON output, tolerating markdown fences."""
    text = raw.strip()
    if text.startswith("```"):
        # Strip leading and trailing fences
        first_newline = text.find("\n")
        if first_newline > 0:
            text = text[first_newline + 1 :]
        if text.endswith("```"):
            text = text[:-3]
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        logger.warning(
            "planner returned non-JSON output (redacted): %s",
            redact_connection_string(raw)[:500],
        )
        return []
    if not isinstance(data, dict):
        return []
    modules = data.get("modules")
    if not isinstance(modules, list):
        return []
    out: list[dict[str, Any]] = []
    for step in modules:
        if not isinstance(step, dict):
            continue
        module = step.get("module")
        collection = step.get("collection")
        if not isinstance(module, str) or not isinstance(collection, str):
            continue
        out.append(
            {
                "module": module,
                "collection": collection,
                "params": step.get("params", {}) if isinstance(step.get("params"), dict) else {},
            }
        )
    return out


__all__ = ["GeminiClient", "Planner", "_Circuit"]
