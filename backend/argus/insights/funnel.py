"""Funnel insight module — schema-aware pipeline generation.

Produces a **SummaryCard** with key metrics about the collection:
total document count, documents in the recent window, and a breakdown
by the best available categorical field.

The pipeline avoids M0-restricted operators (``$facet``,
``$dateSubtract``, ``$dateTrunc``) and instead uses basic stages
(``$match``, ``$group``, ``$sort``, ``$limit``, ``$project``)
that work on all MongoDB Atlas tiers.
"""

from __future__ import annotations

from typing import Any

from argus.insights.pipeline_utils import (
    cutoff_date_match,
    find_categorical_field,
    find_date_field,
    get_collection_fields,
)
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


class FunnelModule:
    """Funnel insight module."""

    name = ModuleName.FUNNEL
    required_collections = ["users"]

    def can_run(self, sampled_schema: dict[str, Any]) -> bool:
        """Return True if any collection has at least a date field."""
        for coll_name in _find_usable_collections(sampled_schema):
            fields = get_collection_fields(sampled_schema, coll_name)
            if find_date_field(fields):
                return True
        return False

    def generate_pipeline(
        self, sampled_schema: dict[str, Any], params: dict[str, Any]
    ) -> list[dict]:
        """Build a schema-aware funnel pipeline.

        Strategy: group by the best categorical field (if any) to
        produce a top-N breakdown, filtered to the recent window.
        Falls back to a simple count if no categorical field exists.
        """
        collection = params.get("collection") or "users"
        fields = params.get("fields") or get_collection_fields(sampled_schema, collection)
        lookback = int(params.get("lookback_days", 30))

        date_field = find_date_field(fields)
        cat_field = find_categorical_field(fields)

        pipeline: list[dict] = []

        # 1) Date filter (if we have a date field)
        if date_field:
            pipeline.append(cutoff_date_match(date_field, lookback))

        # 2) Group by categorical field for breakdown
        if cat_field:
            pipeline.extend([
                {
                    "$group": {
                        "_id": f"${cat_field}",
                        "count": {"$sum": 1},
                    }
                },
                {"$sort": {"count": -1}},
                {"$limit": 10},
            ])
        else:
            # Simple count-only pipeline
            pipeline.append({"$count": "count"})

        return pipeline

    def render_card(self, result: list[dict], params: dict[str, Any]) -> CardDescriptor:
        """Render a SummaryCard (with optional BarChart) from the pipeline result."""
        if not result:
            return CardDescriptor.error(
                "Funnel pipeline returned no results",
                title="Funnel: no data",
            )

        collection = params.get("collection", "users")

        # Case 1: plain $count result → single doc like {"count": N}
        if len(result) == 1 and "count" in result[0] and "_id" not in result[0]:
            total = int(result[0]["count"])
            findings = [
                SummaryFinding(
                    text=f"{total:,} total documents",
                    severity=SummaryFindingSeverity.INFO,
                    metric="total_count",
                ),
            ]
            summary = SummaryCardProps(
                title=f"Funnel: {collection} overview",
                summary=f"{total:,} documents found in {collection}.",
                findings=findings,
            )
            return CardDescriptor.from_card(CardName.SUMMARY_CARD, summary)

        # Case 2: grouped by categorical field → bar chart + summary
        total = sum(int(row.get("count", 0)) for row in result)
        top_category = result[0].get("_id", "?") if result else "?"
        top_count = int(result[0].get("count", 0)) if result else 0

        bars: list[BarChartBar] = [
            BarChartBar(
                label=str(row.get("_id") or "other"),
                value=float(row.get("count", 0)),
            )
            for row in result[:10]
        ]

        findings: list[SummaryFinding] = [
            SummaryFinding(
                text=f"{total:,} documents across {len(result)} categories",
                severity=SummaryFindingSeverity.INFO,
                metric="total_count",
            ),
        ]
        if top_category and top_count:
            pct = (top_count / total * 100) if total else 0
            findings.append(
                SummaryFinding(
                    text=f'Top category: "{top_category}" ({top_count:,}, {pct:.0f}%)',
                    severity=SummaryFindingSeverity.INFO,
                    metric="top_category",
                )
            )

        related = None
        if bars:
            related = BarChartCardProps(
                title=f"Top categories in {collection}",
                orientation=BarChartOrientation.VERTICAL,
                bars=bars,
                sort_by="value-desc",
                show_values=True,
            )

        summary = SummaryCardProps(
            title=f"Funnel: {collection} overview",
            summary=f"{total:,} documents across {len(result)} categories.",
            findings=findings,
            related_card=related,
        )
        return CardDescriptor.from_card(CardName.SUMMARY_CARD, summary)


def _find_usable_collections(schema: dict[str, Any]) -> list[str]:
    """Return collection names from the schema."""
    from argus.insights.pipeline_utils import get_all_collections
    return get_all_collections(schema)


__all__ = ["FunnelModule"]
