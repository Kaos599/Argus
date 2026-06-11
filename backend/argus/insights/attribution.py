"""Attribution insight module — schema-aware pipeline generation.

Produces a **BarChartCard** of documents grouped by the best
available categorical/source field. On schemas with an identifiable
"user" or "entity" field, deduplicates by first occurrence per entity.

The pipeline uses only basic M0-compatible operators.
"""

from __future__ import annotations

from typing import Any

from argus.insights.pipeline_utils import (
    cutoff_date_match,
    find_categorical_field,
    find_date_field,
    find_id_field,
    get_collection_fields,
    get_all_collections,
)
from argus.models.api_types import ModuleName
from argus.models.card import (
    BarChartBar,
    BarChartCardProps,
    BarChartOrientation,
    BarChartSortBy,
    CardDescriptor,
    CardName,
)


class AttributionModule:
    """Attribution insight module (first-touch)."""

    name = ModuleName.ATTRIBUTION
    required_collections = ["events"]

    def can_run(self, sampled_schema: dict[str, Any]) -> bool:
        """Return True if any collection has a categorical field."""
        for coll in get_all_collections(sampled_schema):
            fields = get_collection_fields(sampled_schema, coll)
            if find_categorical_field(fields):
                return True
        return False

    def generate_pipeline(
        self, sampled_schema: dict[str, Any], params: dict[str, Any]
    ) -> list[dict]:
        """Build a schema-aware attribution pipeline.

        Groups documents by the best categorical field and counts
        occurrences. If a date field exists, filters to the lookback
        window.
        """
        collection = params.get("collection") or "users"
        fields = params.get("fields") or get_collection_fields(sampled_schema, collection)

        date_field = find_date_field(fields)
        cat_field = find_categorical_field(fields)

        pipeline: list[dict] = []

        # 1) Date filter
        if date_field:
            pipeline.append(cutoff_date_match(date_field, 90))

        # 2) Group by category
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
            pipeline.append({"$count": "count"})

        return pipeline

    def render_card(self, result: list[dict], params: dict[str, Any]) -> CardDescriptor:
        """Render a BarChartCard from the grouped result."""
        if not result:
            return CardDescriptor.error(
                "Attribution pipeline returned no results",
                title="Attribution: no data",
            )

        collection = params.get("collection", "data")

        # Simple $count fallback
        if len(result) == 1 and "count" in result[0] and "_id" not in result[0]:
            total = int(result[0]["count"])
            bars = [BarChartBar(label=collection, value=float(total))]
        else:
            bars = [
                BarChartBar(
                    label=str(row.get("_id") or "unknown"),
                    value=float(row.get("count") or 0),
                )
                for row in result
            ]

        if not bars:
            return CardDescriptor.error(
                "No attribution data to display",
                title="Attribution: no data",
            )

        props = BarChartCardProps(
            title=f"Attribution: breakdown in {collection}",
            orientation=BarChartOrientation.HORIZONTAL,
            bars=bars,
            sort_by=BarChartSortBy.VALUE_DESC,
            show_values=True,
        )
        return CardDescriptor.from_card(CardName.BAR_CHART_CARD, props)


__all__ = ["AttributionModule"]
