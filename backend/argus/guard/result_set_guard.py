"""Result-set guard — read-only enforcement at the planner layer.

This is one of the three layers of write protection in Argus:

    1. ``mongodb-mcp-server`` runs with ``--readOnly`` and
       ``MDB_MCP_READ_ONLY=true``. The MCP server itself refuses
       write tools.
    2. The session store hands the user's connection string to the
       subprocess. We recommend (and the onboarding flow nudges)
       using a MongoDB user with read-only permissions.
    3. **This module.** Before any MQL pipeline is dispatched to the
       MCP server, we run it through the guard:

       - Reject if any stage is ``$out`` or ``$merge`` (catastrophic,
         would persist data outside the user's read-only boundary).
       - Enforce a ``.limit()`` on every ``find``/``aggregate`` call so
         a misbehaving planner doesn't ship a 10M-document result.
       - Redact connection strings from log lines (they can sneak in
         via error messages).

Anything that fails the guard raises a ``GuardViolation`` with a typed
error envelope so the API layer can return the right HTTP status and
``ErrorCode``.
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any

from argus.models.api_types import ErrorCode

# ---------------------------------------------------------------------------
# Connection-string redaction
# ---------------------------------------------------------------------------

# Captures ``mongodb://user:pass@...`` and ``mongodb+srv://user:pass@...``.
# We replace the password component with ``***``. The username is kept
# because it's not a secret.
_CONN_STR_RE = re.compile(
    r"(mongodb(?:\+srv)?://)([^:\s]+):([^@\s]+)@",
    flags=re.IGNORECASE,
)


def redact_connection_string(text: str) -> str:
    """Replace the password in any MongoDB connection string with ``***``.

    The connection string shape is
    ``mongodb[+srv]://user:password@host[:port]/db[?options]``. We keep
    the scheme, username, host, and everything after the ``@``; only
    the password is replaced.
    """
    return _CONN_STR_RE.sub(r"\1\2:***@", text)


# ---------------------------------------------------------------------------
# MQL validation
# ---------------------------------------------------------------------------

# Stages that would persist data outside the read-only boundary. We
# reject the whole pipeline if any of these appear.
_FORBIDDEN_STAGES: frozenset[str] = frozenset({"$out", "$merge"})
_QUERY_TOOLS: frozenset[str] = frozenset({"mongodb_find", "mongodb_aggregate"})
_PASSTHROUGH_TOOLS: frozenset[str] = frozenset(
    {
        "mongodb_list_collections",
        "mongodb_collection_schema",
    }
)


@dataclass(frozen=True)
class GuardViolation(Exception):
    """Raised when an MQL pipeline or query violates the read-only guard."""

    code: ErrorCode
    message: str
    technical_details: str | None = None
    guidance: str | None = None

    def __str__(self) -> str:  # pragma: no cover — trivial
        return f"[{self.code.value}] {self.message}"


# ---------------------------------------------------------------------------
# Pipeline validation
# ---------------------------------------------------------------------------


def _stage_name(stage: Any) -> str | None:
    """Return the canonical stage name from a pipeline stage dict.

    A stage is a single-key dict like ``{"$match": {...}}``. We return
    the key. Returns ``None`` if the stage isn't shaped like that or
    if the key doesn't start with ``$`` (which means it's not a
    MongoDB stage operator at all).
    """
    if not isinstance(stage, dict) or len(stage) != 1:
        return None
    (key,) = stage.keys()
    if not key or not str(key).startswith("$"):
        return None
    return str(key)


def _walk_pipeline_for_forbidden(pipeline: list[dict], path: str = "") -> None:
    """Recursively walk a pipeline looking for forbidden stages.

    MongoDB allows nested pipelines inside ``$facet``, ``$lookup``,
    ``$unionWith``, ``$graphLookup``. A write stage hidden
    inside a ``$facet`` would still execute. We have to inspect
    those nested pipelines.
    """
    for index, stage in enumerate(pipeline):
        if not isinstance(stage, dict) or len(stage) != 1:
            continue
        (name, body) = next(iter(stage.items()))
        full_path = f"{path}[{index}].{name}"
        if name in _FORBIDDEN_STAGES:
            raise GuardViolation(
                code=ErrorCode.READ_ONLY_VIOLATION,
                message=(
                    f"Pipeline contains forbidden stage {name!r} at {full_path} — "
                    "read-only enforcement does not allow data to leave the query path."
                ),
                technical_details=(
                    "All write stages are blocked at the planner layer. "
                    "Use a read-only aggregation instead."
                ),
            )
        # Recurse into nested pipelines.
        if not isinstance(body, dict):
            continue
        for sub_key, sub_value in body.items():
            # $lookup.pipeline, $unionWith.pipeline, $graphLookup's "then"/"else"
            if sub_key in ("pipeline", "inner") and isinstance(sub_value, list):
                _walk_pipeline_for_forbidden(
                    [s for s in sub_value if isinstance(s, dict)],
                    path=f"{full_path}.{sub_key}",
                )
            # $facet: { "branch_name": [stages...], ... }
            elif sub_key == "facet" and isinstance(sub_value, dict):
                for branch_name, branch_stages in sub_value.items():
                    if isinstance(branch_stages, list):
                        _walk_pipeline_for_forbidden(
                            [s for s in branch_stages if isinstance(s, dict)],
                            path=f"{full_path}.facet.{branch_name}",
                        )
            # $unionWith with coll + pipeline
            elif sub_key == "coll" and isinstance(sub_value, str):
                continue
            # Generic: any value that is a list of dicts, treat as a nested pipeline.
            elif isinstance(sub_value, list):
                _walk_pipeline_for_forbidden(
                    [s for s in sub_value if isinstance(s, dict)],
                    path=f"{full_path}.{sub_key}",
                )
        # Recurse into nested pipelines.
        if isinstance(body, dict):
            for sub_key, sub_value in body.items():
                if sub_key in ("pipeline", "inner", "then", "else") and isinstance(sub_value, list):
                    _walk_pipeline_for_forbidden(
                        [s for s in sub_value if isinstance(s, dict)],
                        path=f"{full_path}.{sub_key}",
                    )
                if sub_key == "facet" and isinstance(sub_value, dict):
                    for facet_key, facet_value in sub_value.items():
                        if isinstance(facet_value, list):
                            _walk_pipeline_for_forbidden(
                                [s for s in facet_value if isinstance(s, dict)],
                                path=f"{full_path}.facet.{facet_key}",
                            )


def validate_pipeline(pipeline: Iterable[dict], *, max_stages: int = 50) -> list[dict]:
    """Validate a MongoDB aggregation pipeline.

    Raises ``GuardViolation`` with ``READ_ONLY_VIOLATION`` if any stage
    is ``$out`` or ``$merge`` (including nested inside ``$facet``,
    ``$lookup``, etc.), or ``INVALID_INPUT`` if the shape is
    malformed.

    Returns the pipeline unchanged (a list copy) on success.
    """
    try:
        materialized = list(pipeline)
    except TypeError as exc:
        raise GuardViolation(
            code=ErrorCode.INVALID_INPUT,
            message="Pipeline is not iterable",
            technical_details=str(exc),
        ) from exc

    if len(materialized) > max_stages:
        raise GuardViolation(
            code=ErrorCode.INVALID_INPUT,
            message=f"Pipeline has {len(materialized)} stages, max is {max_stages}",
            guidance="Simplify the pipeline or split into multiple plans.",
        )

    for index, stage in enumerate(materialized):
        if _stage_name(stage) is None:
            raise GuardViolation(
                code=ErrorCode.INVALID_INPUT,
                message=(f"Stage at index {index} is not a valid MongoDB aggregation stage"),
                technical_details=(
                    f"Each stage must be a single-key dict whose key starts with '$'. "
                    f"Got: {stage!r}"
                ),
            )

    _walk_pipeline_for_forbidden(materialized)
    return materialized


# ---------------------------------------------------------------------------
# find / aggregate argument validation
# ---------------------------------------------------------------------------


def enforce_limit(
    args: dict,
    *,
    max_documents: int,
) -> dict:
    """Enforce a ``.limit()`` on find/aggregate call arguments.

    For ``find`` we expect ``args['filter']`` and ``args['limit']`` (the
    MCP server convention). For ``aggregate`` we expect ``args['pipeline']``
    and we add/overwrite a trailing ``$limit`` stage.

    Returns a shallow copy of the args dict with the limit applied.
    """
    if not isinstance(args, dict):
        raise GuardViolation(
            code=ErrorCode.INVALID_INPUT,
            message="Tool args must be a JSON object",
            technical_details=f"Got: {type(args).__name__}",
        )

    if max_documents <= 0:
        raise GuardViolation(
            code=ErrorCode.INVALID_INPUT,
            message="max_documents must be a positive integer",
        )

    op = args.get("operation") or _infer_operation(args)
    if op is None:
        # We can't enforce a limit if we don't know the operation.
        # Fail closed.
        raise GuardViolation(
            code=ErrorCode.INVALID_INPUT,
            message="Cannot determine operation from args; refusing to dispatch",
            technical_details=f"args keys: {sorted(args.keys())}",
        )

    out = dict(args)
    if op == "find":
        existing = out.get("limit")
        if existing is None or int(existing) > max_documents:
            out["limit"] = max_documents
    elif op == "aggregate":
        pipeline = out.get("pipeline")
        if not isinstance(pipeline, list):
            raise GuardViolation(
                code=ErrorCode.INVALID_INPUT,
                message="aggregate requires a 'pipeline' array",
            )
        # If the last stage is already a $limit, ensure it's not too high.
        if pipeline and isinstance(pipeline[-1], dict) and "$limit" in pipeline[-1]:
            last = pipeline[-1]["$limit"]
            if isinstance(last, (int, float)) and last > max_documents:
                pipeline = list(pipeline[:-1]) + [{"$limit": max_documents}]
            elif last is None:
                pipeline = list(pipeline[:-1]) + [{"$limit": max_documents}]
            # If the user explicitly asked for a smaller limit, leave it.
        else:
            pipeline = list(pipeline) + [{"$limit": max_documents}]
        out["pipeline"] = pipeline
    else:
        # Unknown op — be conservative and refuse.
        raise GuardViolation(
            code=ErrorCode.INVALID_INPUT,
            message=f"Operation {op!r} is not allowed; use 'find' or 'aggregate'",
        )
    return out


def _infer_operation(args: dict) -> str | None:
    """Infer the operation type from the args shape.

    Heuristic: presence of ``pipeline`` => aggregate; ``filter`` =>
    find; otherwise unknown.
    """
    if "pipeline" in args:
        return "aggregate"
    if "filter" in args:
        return "find"
    return None


# ---------------------------------------------------------------------------
# High-level guard
# ---------------------------------------------------------------------------


def guard_tool_call(
    tool_name: str,
    args: dict,
    *,
    max_documents: int,
) -> dict:
    """Top-level entry point: validate, enforce limits, and return safe args.

    Combines ``validate_pipeline`` (for any pipeline present) with
    ``enforce_limit`` (for find/aggregate args) into one call.

    Raises ``GuardViolation`` on any failure.
    """
    if not isinstance(args, dict):
        raise GuardViolation(
            code=ErrorCode.INVALID_INPUT,
            message="Tool args must be a JSON object",
            technical_details=f"Got: {type(args).__name__}",
        )

    if tool_name in _PASSTHROUGH_TOOLS:
        return dict(args)

    if tool_name not in _QUERY_TOOLS:
        raise GuardViolation(
            code=ErrorCode.INVALID_INPUT,
            message=f"Tool {tool_name!r} is not allowed by the result-set guard",
        )

    safe_args = enforce_limit(args, max_documents=max_documents)
    pipeline = safe_args.get("pipeline")
    if isinstance(pipeline, list):
        safe_args["pipeline"] = validate_pipeline(pipeline)
    return safe_args


__all__ = [
    "GuardViolation",
    "enforce_limit",
    "guard_tool_call",
    "redact_connection_string",
    "validate_pipeline",
]
