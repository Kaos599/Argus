"""LLM prompts for the planner and chat agents.

The planner prompt takes the sampled schema and the cookbook and
emits a list of (module, collection, params) tuples as JSON. The chat
prompt is a thin system prompt that hands the agent the 7 card types
and asks it to emit a CardDescriptor.

Prompts are intentionally simple — the spec calls for a planner that
"is a Gemini call that takes the sampled schema and returns a list of
(module, collection, params) tuples" and a chat that "streams the
agent's response". The full Tambo integration is out of scope for the
backend; the frontend owns the conversational surface.
"""

from __future__ import annotations

import json
from typing import Any

from argus.insights.base import load_cookbook
from argus.models.api_types import ModuleName

PLANNER_SYSTEM_PROMPT = """\
You are the Argus planner. Given a user's MongoDB schema and a list of \
available insight modules, choose the modules that will produce the \
most useful insights for a typical SaaS dashboard.

Always return valid JSON in exactly this shape:

{
  "modules": [
    {"module": "<name>", "collection": "<coll>", "params": { ... }},
    ...
  ]
}

Where <name> is one of: funnel, cohort, rfm, attribution, anomaly.

Choose 1 to 3 modules. Prefer modules whose required collections \
are present in the schema. Use the cookbook below to pick parameters.

{cookbook}
"""


CHAT_SYSTEM_PROMPT = """\
You are Argus, a read-only analyst for MongoDB Atlas. You can answer \
questions about the user's data, but you must NEVER propose write \
operations. If the user asks to update or delete data, explain that \
Argus is read-only by design.

When you produce a visualization, emit a CardDescriptor JSON object \
with component_name and props fields. The 7 card types are:

- StatCard: a single KPI.
- TimeSeriesCard: a line/area chart.
- BarChartCard: a vertical or horizontal bar chart.
- HeatmapCard: a 2-D heatmap.
- TableCard: a sortable, paginated table.
- SummaryCard: a narrative with findings.
- ErrorCard: a graceful error.

Return JSON only. No prose outside the JSON.
"""


def build_planner_prompt(sampled_schema: dict[str, Any]) -> str:
    """Build the user-prompt for the planner.

    The user-prompt embeds the cookbook for all 5 modules so the
    model can pick the right one for the user's data shape.
    """
    cookbook_chunks: list[str] = []
    for module_name in ModuleName:
        meta = load_cookbook(module_name)
        cookbook_chunks.append(
            f"### {meta.name.value}\n"
            f"Required collections: {', '.join(meta.required_collections)}\n"
            f"Description: {meta.description.strip()}\n"
            f"Parameters: {json.dumps(meta.parameters, default=str)}\n"
        )
    cookbook = "\n".join(cookbook_chunks)

    schema_summary = _summarize_schema(sampled_schema)
    return (
        "Schema sample from the user's MongoDB:\n"
        f"{schema_summary}\n\n"
        "Pick the best 1-3 insight modules. Return JSON only."
    )


def planner_system_prompt() -> str:
    """Return the planner system prompt (with the cookbook)."""
    cookbook_chunks: list[str] = []
    for module_name in ModuleName:
        meta = load_cookbook(module_name)
        cookbook_chunks.append(
            f"### {meta.name.value}\n"
            f"Required collections: {', '.join(meta.required_collections)}\n"
            f"Description: {meta.description.strip()}\n"
            f"Parameters: {json.dumps(meta.parameters, default=str)}\n"
        )
    return PLANNER_SYSTEM_PROMPT.format(cookbook="\n".join(cookbook_chunks))


def chat_system_prompt() -> str:
    return CHAT_SYSTEM_PROMPT


def _summarize_schema(sampled_schema: dict[str, Any]) -> str:
    """Turn a sampled_schema dict into a brief text summary."""
    if not sampled_schema:
        return "(no schema sample available)"
    collections = sampled_schema.get("collections")
    if isinstance(collections, list):
        items = collections
    elif isinstance(collections, dict):
        items = [{"name": k, **(v if isinstance(v, dict) else {})} for k, v in collections.items()]
    else:
        items = []
        for k, v in sampled_schema.items():
            if isinstance(v, dict):
                items.append({"name": k, **v})
            else:
                items.append({"name": k, "doc_count": "?", "sample_fields": []})

    lines: list[str] = []
    for item in items[:10]:
        name = item.get("name", "?")
        doc_count = item.get("doc_count", "?")
        fields = item.get("sample_fields") or item.get("fields") or []
        if isinstance(fields, list) and fields:
            field_str = ", ".join(str(f) for f in fields[:8])
        else:
            field_str = "(no fields sampled)"
        lines.append(f"- {name}: {doc_count} docs; fields: {field_str}")
    return "\n".join(lines) if lines else "(schema summary unavailable)"


__all__ = [
    "CHAT_SYSTEM_PROMPT",
    "PLANNER_SYSTEM_PROMPT",
    "build_planner_prompt",
    "chat_system_prompt",
    "planner_system_prompt",
]
