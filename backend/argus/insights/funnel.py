"""Funnel insight module.

Multi-metric cohort analysis using a single ``$facet`` aggregation. The
pipeline returns signups, activations, revenue, and the top-10 country
counts in a single round-trip — the showcase pipeline from
``research/13-mql-examples.md``.

Card output: 3 StatCards (signups / activations / revenue) wrapped in
a SummaryCard, plus a BarChartCard of the top countries. For the
``render`` endpoint (which expects a single ``CardDescriptor``) we
return a single SummaryCard with the related_bar chart attached.
"""

from __future__ import annotations

from typing import Any

from argus.models.api_types import ModuleName
from argus.models.card import (
    BarChartBar,
    BarChartCardProps,
    BarChartOrientation,
    CardDescriptor,
    CardName,
    SummaryCardProps,
    SummaryFinding,
    SummaryFindingSeverity,
)

# Default pipeline for the demo. The planner LLM can override the
# field names via the ``params`` dict; for the v1 implementation we
# hardcode the most common schema.
_FUNNEL_PIPELINE: list[dict] = [
    {
        "$match": {
            "signup_date": {
                "$gte": {"$dateSubtract": {"startDate": "$$NOW", "unit": "day", "amount": 7}}
            }
        }
    },
    {
        "$facet": {
            "signups": [{"$count": "count"}],
            "activations": [{"$match": {"activated": True}}, {"$count": "count"}],
            "revenue": [
                {"$match": {"first_purchase_at": {"$exists": True}}},
                {"$group": {"_id": None, "total": {"$sum": "$first_purchase_amount"}}},
            ],
            "by_country": [
                {"$group": {"_id": "$country", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10},
            ],
        }
    },
]


class FunnelModule:
    """Funnel insight module."""

    name = ModuleName.FUNNEL
    required_collections = ["users"]

    def can_run(self, sampled_schema: dict[str, Any]) -> bool:
        users = sampled_schema.get("users") or sampled_schema.get("collections", {}).get("users")
        if not isinstance(users, dict):
            return False
        fields = users.get("sample_fields") or users.get("fields") or []
        # The funnel needs at least a signup date and a country.
        return any("signup" in str(f).lower() for f in fields) and any(
            "country" in str(f).lower() for f in fields
        )

    def generate_pipeline(self, sampled_schema: dict[str, Any], params: dict[str, Any]) -> list[dict]:
        return list(_FUNNEL_PIPELINE)

    def render_card(self, result: list[dict], params: dict[str, Any]) -> CardDescriptor:
        """Render a SummaryCard with 3 KPI tiles + a top-countries bar.

        The ``$facet`` pipeline returns a single document with 4 arrays.
        We pull the metrics out of those arrays.
        """
        if not result:
            return CardDescriptor.error(
                "Funnel pipeline returned no results",
                title="Funnel: no data",
            )

        first = result[0] if isinstance(result[0], dict) else {}
        signups = _first_int(first.get("signups"), "count")
        activations = _first_int(first.get("activations"), "count")
        revenue_total = _first_float(first.get("revenue"), "total")
        by_country = first.get("by_country") or []

        # 3 StatCards as findings.
        activation_rate = (
            (activations / signups * 100.0)
            if (signups and activations is not None)
            else None
        )
        findings: list[SummaryFinding] = []
        if signups is not None:
            findings.append(
                SummaryFinding(
                    text=f"{signups} signups in the last 7 days",
                    severity=SummaryFindingSeverity.INFO,
                    metric="signups",
                )
            )
        if activations is not None and activation_rate is not None:
            findings.append(
                SummaryFinding(
                    text=f"{activations} activated ({activation_rate:.1f}%)",
                    severity=(
                        SummaryFindingSeverity.WARNING
                        if activation_rate < 30
                        else SummaryFindingSeverity.INFO
                    ),
                    metric="activation_rate",
                )
            )
        if revenue_total is not None:
            findings.append(
                SummaryFinding(
                    text=f"${revenue_total:,.2f} revenue",
                    severity=SummaryFindingSeverity.INFO,
                    metric="revenue",
                )
            )

        # Top countries as a BarChartCard "related_card".
        bars = [
            BarChartBar(label=str(item.get("_id", "?")), value=float(item.get("count", 0)))
            for item in by_country[:10]
        ]
        related = None
        if bars:
            related = BarChartCardProps(
                title="Top countries (last 7 days)",
                orientation=BarChartOrientation.VERTICAL,
                bars=bars,
                sort_by="value-desc",
                show_values=True,
            )

        summary = SummaryCardProps(
            title="Funnel: 7-day overview",
            summary=(
                f"{signups or 0} signups, {activations or 0} activations, "
                f"${(revenue_total or 0):,.2f} revenue."
            ),
            findings=findings,
            related_card=related,
        )
        return CardDescriptor.from_card(CardName.SUMMARY_CARD, summary)


def _first_int(arr: Any, field_name: str) -> int | None:
    if not isinstance(arr, list) or not arr:
        return None
    val = arr[0].get(field_name) if isinstance(arr[0], dict) else None
    return int(val) if val is not None else None


def _first_float(arr: Any, field_name: str) -> float | None:
    if not isinstance(arr, list) or not arr:
        return None
    val = arr[0].get(field_name) if isinstance(arr[0], dict) else None
    return float(val) if val is not None else None


__all__ = ["FunnelModule"]
