"""POST /api/v1/query — answer a natural-language question about the user's data.

For each question, we pattern-match the intent, generate an MQL pipeline
against the user's actual MongoDB (via the session's MCP subprocess), and
return a human-readable response with an optional CardDescriptor.

The 5 intent categories mirror the frontend mock chat in chat.ts:
  - count users       → StatCard
  - top countries     → BarChartCard
  - daily signups     → TimeSeriesCard
  - anomalies         → SummaryCard
  - drop/delete       → ErrorCard (read-only refusal)

If the intent doesn't match any category, we fall back to the LLM for
free-form interpretation.
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, HTTPException

from argus.api.dependencies import get_gemini_client, get_mcp_manager, get_session_store
from argus.api.sample import _infer_database
from argus.insights.card_renderer import all_modules, get_module
from argus.llm.gemini_client import GeminiClient
from argus.mcp.manager import McpManager
from argus.models.api_types import (
    ErrorCode,
    ErrorResponse,
    QueryRequest,
    QueryResponse,
)
from argus.models.card import (
    BarChartBar,
    BarChartCardProps,
    CardDescriptor,
    CardName,
    StatCardProps,
    SummaryCardProps,
    SummaryFinding,
    SummaryFindingSeverity,
    TimeSeriesCardProps,
    TimeSeriesSeries,
    TimeSeriesPoint,
)
from argus.state.session_store import SessionStore

logger = logging.getLogger(__name__)

router = APIRouter(tags=["query"])


@router.post("/query", response_model=QueryResponse)
async def query(
    request: QueryRequest,
    mcp: McpManager = Depends(get_mcp_manager),
    store: SessionStore = Depends(get_session_store),
    gemini: GeminiClient = Depends(get_gemini_client),
) -> QueryResponse:
    """Answer a natural-language question using the user's live MongoDB data."""
    token = request.session_token
    try:
        session = await store.require(token)
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

    database = _infer_database(session.connection_string) if getattr(session, "connection_string", None) else None
    message = request.message.strip().lower()

    # ------------------------------------------------------------------
    # 1. Read-only intent — reject destructive commands
    # ------------------------------------------------------------------
    if _is_destructive(message):
        return QueryResponse(
            content=(
                "I can't do that — Argus is read-only by design. "
                "Three layers of write protection make this impossible: "
                "the MCP server is started with MDB_MCP_READ_ONLY=true, "
                "your database user has only read permissions, and the "
                "result_set_guard blocks $out/$merge before they ever "
                "reach MongoDB."
            ),
            card=CardDescriptor(
                componentName=CardName.ERROR_CARD,
                props={
                    "title": "Write refused",
                    "message": "Argus can never perform writes against your cluster.",
                    "isReadOnlyViolation": True,
                    "isRetryable": False,
                    "guidance": (
                        "If you need to drop a collection, do it from "
                        "the MongoDB shell or Atlas UI as a separate, "
                        "explicit operation."
                    ),
                    "errorCode": ErrorCode.READ_ONLY_VIOLATION.value,
                },
            ),
        )

    # ------------------------------------------------------------------
    # 2. Intent matching → real MQL execution
    # ------------------------------------------------------------------
    sampled_schema = session.sampled_schema or {}

    try:
        # --- Count users ---
        if _is_count_users_intent(message):
            return await _handle_count_users(token, database, sampled_schema, mcp)

        # --- Top countries ---
        if _is_top_countries_intent(message):
            return await _handle_top_countries(token, database, sampled_schema, mcp)

        # --- Daily signups / time series ---
        if _is_time_series_intent(message):
            return await _handle_time_series(token, database, sampled_schema, mcp)

        # --- Anomalies / insights ---
        if _is_anomalies_intent(message):
            return await _handle_anomalies(token, database, sampled_schema, mcp)

        # --- Top spenders / table ---
        if _is_table_intent(message):
            return await _handle_table(token, database, sampled_schema, mcp)

        # --- Fallback: use LLM to interpret ---
        return await _handle_llm_fallback(token, database, message, sampled_schema, gemini, mcp, store)

    except Exception as exc:
        logger.exception("query failed: %s", exc)
        return QueryResponse(
            content="Sorry, I couldn't answer that question. The query failed against your cluster.",
            card=CardDescriptor(
                componentName=CardName.ERROR_CARD,
                props={
                    "title": "Query failed",
                    "message": str(exc)[:500],
                    "isRetryable": True,
                },
            ),
        )


# =========================================================================
# Intent classifiers
# =========================================================================


def _is_destructive(message: str) -> bool:
    keywords = ("drop", "delete", "remove the", "truncate", "update", "insert", "create")
    return any(k in message for k in keywords)


def _is_count_users_intent(message: str) -> bool:
    return ("count" in message and "user" in message) or message in ("how many users", "total users")


def _is_top_countries_intent(message: str) -> bool:
    return any(k in message for k in ("top", "country", "countries", "by country", "region"))


def _is_time_series_intent(message: str) -> bool:
    return any(k in message for k in ("daily", "signup", "trend", "over time", "last 30", "per day"))


def _is_anomalies_intent(message: str) -> bool:
    return any(k in message for k in ("anomal", "insight", "what", "interesting", "unusual"))


def _is_table_intent(message: str) -> bool:
    return any(k in message for k in ("spend", "top users", "table", "list", "highest"))


# =========================================================================
# Handlers — each runs a real MQL pipeline via MCP
# =========================================================================


def _best_collection(
    sampled_schema: dict,
    preferred_names: list[str] | None = None,
    required_fields: list[str] | None = None,
) -> str:
    """Pick the collection that best matches *preferred_names* AND/OR has
    the most *required_fields* in its sample_fields.

    Falls back to the first collection, then 'users', then 'orders'.
    """
    if not sampled_schema:
        return "users"
    names = list(sampled_schema.keys())

    def score(coll: str) -> int:
        s = 0
        if preferred_names:
            for p in preferred_names:
                if p in coll.lower():
                    s += 2
        if required_fields:
            fields = {f.lower() for f in sampled_schema[coll].get("sample_fields", [])}
            for rf in required_fields:
                if rf.lower() in fields:
                    s += 3
        return s

    scored = sorted(names, key=score, reverse=True)
    return scored[0] if scored else "users"


def _infer_date_field(sampled_schema: dict, coll: str) -> str:
    """Return the most plausible date field for *coll*."""
    fields = [f.lower() for f in sampled_schema.get(coll, {}).get("sample_fields", [])]
    for candidate in ("createdat", "created_at", "ts", "timestamp", "date", "updatedat", "updated_at"):
        if candidate in fields:
            return candidate
    return "createdAt"


def _build_mql_args(collection: str, pipeline: list[dict], database: str | None) -> dict:
    args: dict = {"collection": collection, "pipeline": pipeline}
    if database:
        args["database"] = database
    return args


async def _run_mql(token: str, args: dict, mcp: McpManager) -> list[dict]:
    result = await mcp.call_tool(token, "mongodb_aggregate", args)
    return _extract_documents(result)


async def _handle_count_users(
    token: str, database: str | None, sampled_schema: dict, mcp: McpManager
) -> QueryResponse:
    coll = _best_collection(
        sampled_schema,
        preferred_names=["user", "customer", "account", "profile"],
        required_fields=[],
    )
    docs = await _run_mql(token, _build_mql_args(coll, [{"$count": "count"}], database), mcp)
    count = docs[0]["count"] if docs else 0
    doc_total = sampled_schema.get(coll, {}).get("doc_count", 0)
    return QueryResponse(
        content=(
            f"I queried the **`{coll}`** collection in your database "
            f"and found **{count:,} documents**."
            if count == doc_total
            else (
                f"I queried the **`{coll}`** collection in your database "
                f"and found **{count:,} documents** "
                f"(out of {doc_total:,} total documents sampled)."
            )
        ),
        card=CardDescriptor(
            componentName=CardName.STAT_CARD,
            props=StatCardProps(
                label=f"Documents in {coll}",
                value=float(count) if isinstance(count, (int, float)) else 0,
                unit="count",
            ).model_dump(by_alias=True, exclude_none=False),
        ),
    )


async def _handle_top_countries(
    token: str, database: str | None, sampled_schema: dict, mcp: McpManager
) -> QueryResponse:
    coll = _best_collection(
        sampled_schema,
        preferred_names=["user", "customer", "account"],
        required_fields=["country"],
    )
    pipeline: list[dict] = [
        {"$group": {"_id": "$country", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    docs = await _run_mql(token, _build_mql_args(coll, pipeline, database), mcp)
    bars = [
        BarChartBar(label=str(d.get("_id", "?")), value=float(d.get("count", 0)))
        for d in docs if isinstance(d, dict)
    ]
    if not bars:
        return QueryResponse(
            content=(
                f"I checked the **`{coll}`** collection but couldn't "
                f"find any documents with a country field to group by."
            )
        )
    total = sum(b.value for b in bars)
    return QueryResponse(
        content=(
            f"I grouped documents in **`{coll}`** by country and found "
            f"**{len(bars)} countries** with a total of **{total:,.0f} documents**. "
            f"The top entry is **{bars[0].label}** with **{bars[0].value:,.0f}** documents."
        ),
        card=CardDescriptor(
            componentName=CardName.BAR_CHART_CARD,
            props=BarChartCardProps(
                title=f"Top countries by {coll}",
                orientation="horizontal",
                bars=bars,
                sortBy="value-desc",
                showValues=True,
            ).model_dump(by_alias=True, exclude_none=False),
        ),
    )


async def _handle_time_series(
    token: str, database: str | None, sampled_schema: dict, mcp: McpManager
) -> QueryResponse:
    coll = _best_collection(
        sampled_schema,
        preferred_names=["user", "event", "session", "order", "signup"],
        required_fields=["createdAt", "created_at", "ts", "timestamp"],
    )
    date_field = _infer_date_field(sampled_schema, coll)
    pipeline: list[dict] = [
        {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": f"${date_field}"}}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
        {"$limit": 30},
    ]
    docs = await _run_mql(token, _build_mql_args(coll, pipeline, database), mcp)
    points = [
        TimeSeriesPoint(t=str(d.get("_id", "")), v=float(d.get("count", 0)))
        for d in docs if isinstance(d, dict) and d.get("_id")
    ]
    if not points:
        return QueryResponse(
            content=(
                f"I checked the **`{coll}`** collection but couldn't "
                f"find any date-based data to build a time series from."
            )
        )
    total = sum(p.v for p in points)
    avg = round(total / len(points), 1)
    return QueryResponse(
        content=(
            f"I looked at the **`{coll}`** collection and grouped documents "
            f"by **`{date_field}`** over the last **{len(points)} days**. "
            f"The total across this period is **{total:,.0f} documents** "
            f"with an average of **{avg} per day**."
        ),
        card=CardDescriptor(
            componentName=CardName.TIME_SERIES_CARD,
            props=TimeSeriesCardProps(
                title=f"Daily {coll}",
                series=[TimeSeriesSeries(name="Count", points=points, color="primary")],
                granularity="day",
            ).model_dump(by_alias=True, exclude_none=False),
        ),
    )


async def _handle_anomalies(
    token: str, database: str | None, sampled_schema: dict, mcp: McpManager
) -> QueryResponse:
    try:
        module = get_module("anomaly")
    except KeyError:
        return QueryResponse(content="The anomaly module is not available on this instance.")
    try:
        pipeline = module.generate_pipeline(sampled_schema, {})
    except Exception:
        return QueryResponse(content="I wasn't able to build an anomaly detection pipeline from the sampled schema.")
    coll = module.required_collections[0]
    docs = await _run_mql(token, _build_mql_args(coll, pipeline, database), mcp)
    if not docs:
        return QueryResponse(
            content=(
                f"I ran an anomaly detection pipeline against **`{coll}`** "
                f"but didn't find any unusual patterns."
            )
        )
    descriptor = module.render_card(docs, {})
    coll_doc_count = sampled_schema.get(coll, {}).get("doc_count", 0)
    return QueryResponse(
        content=(
            f"I analyzed the **`{coll}`** collection ({coll_doc_count:,} documents) "
            f"and found **{len(docs)} anomaly patterns**. Here's what stands out:"
        ),
        card=descriptor,
    )


async def _handle_table(
    token: str, database: str | None, sampled_schema: dict, mcp: McpManager
) -> QueryResponse:
    coll = _best_collection(
        sampled_schema,
        preferred_names=["user", "customer", "order", "transaction"],
        required_fields=["email", "lifetimeValue", "amount"],
    )
    sort_field = "lifetimeValue"
    fields = sampled_schema.get(coll, {}).get("sample_fields", [])
    if "lifetimeValue" not in fields and "amount" in fields:
        sort_field = "amount"
    pipeline: list[dict] = [
        {"$sort": {sort_field: -1}},
        {"$limit": 25},
        {"$project": {"_id": 0, "email": 1, "country": 1, sort_field: 1}},
    ]
    docs = await _run_mql(token, _build_mql_args(coll, pipeline, database), mcp)
    if not docs:
        return QueryResponse(
            content=f"I checked the **`{coll}`** collection but it appears to be empty."
        )
    total_docs = sampled_schema.get(coll, {}).get("doc_count", 0)
    rows = [
        {
            "email": d.get("email", f"user{ i }@example.com"),
            "country": d.get("country", "?"),
            "ltv": d.get(sort_field, 0) or 0,
        }
        for i, d in enumerate(docs)
    ]
    return QueryResponse(
        content=(
            f"Here are the top **{len(rows)} records** from the "
            f"**`{coll}`** collection (out of {total_docs:,} total documents), "
            f"sorted by **`{sort_field}`** descending."
        ),
        card=CardDescriptor(
            componentName=CardName.TABLE_CARD,
            props={
                "title": f"Top records from {coll}",
                "columns": [
                    {"key": "email", "label": "Email", "format": "text", "sortable": True, "align": "left"},
                    {"key": "country", "label": "Country", "format": "text", "sortable": True, "align": "left"},
                    {"key": "ltv", "label": "Value", "format": "usd", "sortable": True, "align": "right"},
                ],
                "rows": rows,
                "pageSize": 10,
                "enableSearch": True,
                "enableExport": True,
            },
        ),
    )


async def _handle_llm_fallback(
    token: str,
    database: str | None,
    message: str,
    sampled_schema: dict,
    gemini: GeminiClient,
    mcp: McpManager,
    store: SessionStore,
) -> QueryResponse:
    """Use the LLM to answer a free-form question by generating MQL."""
    from argus.llm.prompts import _summarize_schema

    schema_text = _summarize_schema(sampled_schema) if sampled_schema else "(no schema)"
    prompt = (
        f"The user's MongoDB has this schema:\n{schema_text}\n\n"
        f"The user asks: {message}\n\n"
        "If the question requires a MongoDB aggregation, return a JSON object with:\n"
        '  - "content": a plain-text answer\n'
        '  - "collection": the collection name\n'
        '  - "pipeline": an MQL pipeline as a JSON array\n'
        "Return JSON only. If the question doesn't need data, just return "
        '{"content": "answer text"}.'
    )
    try:
        raw = await gemini.generate(prompt, max_output_tokens=2048, temperature=0.1)
    except Exception:
        return QueryResponse(
            content="I'm not sure how to answer that. Try asking about counts, top countries, or trends."
        )

    try:
        parsed = _parse_json(raw)
    except Exception:
        return QueryResponse(content=raw.strip() or "I'm not sure how to answer that.")

    content = parsed.get("content", "") or raw[:500]
    coll = parsed.get("collection")
    pipeline = parsed.get("pipeline")
    if coll and isinstance(pipeline, list) and pipeline:
        try:
            if coll not in (list(sampled_schema.keys()) if sampled_schema else []):
                pass  # try it anyway
            docs = await _run_mql(token, _build_mql_args(coll, pipeline, database), mcp)
            if docs:
                card = CardDescriptor(
                    componentName=CardName.TABLE_CARD,
                    props={
                        "title": "Query result",
                        "columns": [
                            {"key": k, "label": k, "format": "text", "sortable": True, "align": "left"}
                            for k in (list(docs[0].keys()) if docs else [])[:5]
                        ],
                        "rows": docs[:25],
                        "pageSize": 10,
                        "enableSearch": True,
                        "enableExport": True,
                    },
                )
                return QueryResponse(content=content, card=card)
        except Exception as exc:
            logger.warning("LLM-generated query failed: %s", exc)

    return QueryResponse(content=content)


def _parse_json(raw: str) -> dict:
    text = raw.strip()
    if text.startswith("```"):
        first_nl = text.find("\n")
        if first_nl > 0:
            text = text[first_nl + 1:]
        if text.endswith("```"):
            text = text[:-3]
    result = json.loads(text)
    return result if isinstance(result, dict) else {}


def _extract_documents(result: dict | list) -> list[dict]:
    if isinstance(result, list):
        return [d for d in result if isinstance(d, dict)]
    if not isinstance(result, dict):
        return []
    for key in ("documents", "cursor", "firstBatch", "result"):
        value = result.get(key)
        if isinstance(value, list):
            return [d for d in value if isinstance(d, dict)]
    return []


__all__ = ["router"]
