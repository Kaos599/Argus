"""POST /api/v1/plan — generate a plan (which modules to run, with what params)."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from argus.api.dependencies import get_planner, get_session_store
from argus.llm.gemini_client import Planner
from argus.models.api_types import (
    ErrorCode,
    ErrorResponse,
    ModuleName,
    PlanRequest,
    PlanResponse,
    PlanStep,
)
from argus.state.session_store import Session, SessionStore

router = APIRouter(tags=["plan"])


async def _load_session(token: str, store: SessionStore) -> Session:
    """Look up a session by token from the request body, 404 on miss.

    Unlike ``/probe`` and ``/sample`` (which take the token in the
    URL path), the plan endpoint takes the token in the body per
    ``research/15-routes.md``. We re-use the same 404 envelope as
    the path-based resolvers.
    """
    try:
        return await store.require(token)
    except KeyError as exc:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(
                error={
                    "code": ErrorCode.UNKNOWN,
                    "message": "Session not found or expired",
                    "isRetryable": False,
                }
            ).model_dump(by_alias=True),
        ) from exc


@router.post("/plan", response_model=PlanResponse)
async def plan(
    request: PlanRequest,
    planner: Planner = Depends(get_planner),
    store: SessionStore = Depends(get_session_store),
) -> PlanResponse:
    """Generate a plan: which insight modules to run on which collections.

    The planner LLM picks 1-3 modules from the requested set whose
    required collections are present in the sampled schema. For each
    pick, we resolve the module's pipeline and embed it in the
    response so the frontend can preview what will run.
    """
    session = await _load_session(request.session_token, store)
    token = request.session_token

    # Resolve the sampled schema from the session.
    sampled_schema = session.sampled_schema or {}

    # Ask the LLM to plan. We pass the schema; the LLM picks modules
    # + collection + params. If the LLM is unavailable, fall back to
    # a deterministic plan that uses every requested module against
    # its first required collection.
    try:
        steps = await planner.plan(sampled_schema)
    except Exception:
        steps = []

    if not steps:
        steps = _fallback_plan(request.modules, request.collections)

    # Resolve each step to a concrete pipeline via the module registry.
    plan_steps: list[PlanStep] = []
    for step in steps:
        module_name = _coerce_module_name(step.get("module"))
        if module_name is None or module_name not in request.modules:
            continue
        params = step.get("params") or {}
        try:
            from argus.insights.card_renderer import get_module

            module = get_module(module_name)
        except Exception:
            continue

        # Only use collections that are both requested and valid for the module.
        collection = step.get("collection") if isinstance(step.get("collection"), str) else None
        if collection not in request.collections or collection not in module.required_collections:
            collection = next(
                (c for c in request.collections if c in module.required_collections),
                None,
            )
        if not collection:
            continue
        if sampled_schema and not module.can_run(sampled_schema):
            continue

        try:
            pipeline = module.generate_pipeline(sampled_schema, params)
        except Exception:
            continue
        plan_steps.append(
            PlanStep(
                module=module_name,
                collection=collection,
                mql_pipeline=pipeline,
                estimated_runtime_s=None,
            )
        )

    if not plan_steps:
        # If the planner returned steps but they were filtered out
        # because they didn't match the available schema or selected
        # collections, fall back to a deterministic plan.
        if steps:
            steps = _fallback_plan(request.modules, request.collections)
            for step in steps:
                module_name = _coerce_module_name(step.get("module"))
                if module_name is None or module_name not in request.modules:
                    continue
                params = step.get("params") or {}
                try:
                    from argus.insights.card_renderer import get_module

                    module = get_module(module_name)
                except Exception:
                    continue

                collection = step.get("collection") if isinstance(step.get("collection"), str) else None
                if collection not in request.collections or collection not in module.required_collections:
                    collection = next(
                        (c for c in request.collections if c in module.required_collections),
                        None,
                    )
                if not collection:
                    continue
                if sampled_schema and not module.can_run(sampled_schema):
                    continue

                try:
                    pipeline = module.generate_pipeline(sampled_schema, params)
                except Exception:
                    continue
                plan_steps.append(
                    PlanStep(
                        module=module_name,
                        collection=collection,
                        mql_pipeline=pipeline,
                        estimated_runtime_s=None,
                    )
                )

    if not plan_steps:
        raise HTTPException(
            status_code=400,
            detail=ErrorResponse(
                error={
                    "code": ErrorCode.LLM_HALLUCINATION,
                    "message": "Planner could not produce a valid plan for the requested modules",
                    "isRetryable": True,
                    "guidance": "Try fewer modules, or call /sample first to refresh the schema.",
                }
            ).model_dump(by_alias=True),
        )

    plan_id = uuid.uuid4().hex
    # Persist the plan on the session so /render can find it.
    await store.update(
        token,
        plan={"plan_id": plan_id, "plan": [s.model_dump(by_alias=True) for s in plan_steps]},
    )
    return PlanResponse(plan_id=plan_id, plan=plan_steps)


def _fallback_plan(modules: list[ModuleName], collections: list[str]) -> list[dict[str, Any]]:
    """Deterministic fallback when the LLM is unavailable.

    Maps each requested module to its first required collection
    (intersected with the user's chosen collections).
    """
    from argus.insights.card_renderer import all_modules

    by_name = {m.name: m for m in all_modules()}
    fallback: list[dict[str, Any]] = []
    for module_name in modules:
        meta = by_name.get(module_name)
        if meta is None:
            continue
        collection = next((c for c in collections if c in meta.required_collections), None)
        if collection is None:
            continue
        fallback.append({"module": module_name.value, "collection": collection, "params": {}})
    return fallback


def _coerce_module_name(value: Any) -> ModuleName | None:
    if not isinstance(value, str):
        return None
    try:
        return ModuleName(value)
    except ValueError:
        return None


__all__ = ["router"]
