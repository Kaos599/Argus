"""RFM insight module — schema-aware pipeline generation.

Produces a **BarChartCard** showing document distribution by a
meaningful grouping field. On databases with numeric fields it
groups by value ranges; otherwise it groups by the best categorical
field.

The pipeline avoids M0-restricted operators (``$bucket``,
``$dateSubtract``) and uses ``$group`` + ``$sort`` + ``$limit``.
"""

from __future__ import annotations

from typing import Any

from argus.insights.pipeline_utils import (
    cutoff_date_match,
    find_categorical_field,
    find_date_field,
    find_numeric_field,
    get_collection_fields,
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


class RfmModule:
    """RFM insight module."""

    name = ModuleName.RFM
    required_collections = ["orders"]

    def can_run(self, sampled_schema: dict[str, Any]) -> bool:
        """Return True if the orders collection exists with a groupable field."""
        for coll in self.required_collections:
            if coll not in sampled_schema:
                return False
        fields = get_collection_fields(sampled_schema, "orders")
        return bool(find_categorical_field(fields) or find_numeric_field(fields))

    def generate_pipeline(
        self, sampled_schema: dict[str, Any], params: dict[str, Any]
    ) -> list[dict]:
        """Build a schema-aware grouping pipeline.

        Prefers grouping by a categorical field (e.g., status, type).
        If only numeric fields are available, just counts documents.
        """
        collection = params.get("collection") or "users"
        fields = params.get("fields") or get_collection_fields(sampled_schema, collection)
        lookback = int(params.get("lookback_months", 6)) * 30  # approx days

        date_field = find_date_field(fields)
        cat_field = find_categorical_field(fields)

        pipeline: list[dict] = []

        # 1) Date filter
        if date_field:
            pipeline.append(cutoff_date_match(date_field, lookback))

        # 2) Group by categorical field
        if cat_field:
            pipeline.extend(
                [
                    {
                        "$group": {
                            "_id": f"${cat_field}",
                            "count": {"$sum": 1},
                        }
                    },
                    {"$sort": {"count": -1}},
                    {"$limit": 10},
                ]
            )
        else:
            # Fallback: just count
            pipeline.append({"$count": "count"})

        return pipeline

    def render_card(self, result: list[dict], params: dict[str, Any]) -> CardDescriptor:
        """Render a BarChartCard from the grouped result."""
        if not result:
            return CardDescriptor.error(
                "RFM pipeline returned no results",
                title="RFM: no data",
            )

        collection = params.get("collection", "data")

        # Simple $count fallback
        if len(result) == 1 and "count" in result[0] and "_id" not in result[0]:
            total = int(result[0]["count"])
            bars = [BarChartBar(label=collection, value=float(total))]
            props = BarChartCardProps(
                title=f"RFM: {collection} count",
                orientation=BarChartOrientation.VERTICAL,
                bars=bars,
                sort_by=BarChartSortBy.VALUE_DESC,
                show_values=True,
            )
            return CardDescriptor.from_card(CardName.BAR_CHART_CARD, props)

        # Grouped result → bar chart
        bars: list[BarChartBar] = []
        for row in result:
            label = str(row.get("bucket_range") or row.get("_id") or "other")
            value = float(row.get("user_count") or row.get("count") or 0)
            bars.append(BarChartBar(label=label, value=value))

        if not bars:
            return CardDescriptor.error(
                "No segments to display",
                title="RFM: no segments",
            )

        props = BarChartCardProps(
            title=f"RFM: distribution in {collection}",
            orientation=BarChartOrientation.VERTICAL,
            bars=bars,
            sort_by=BarChartSortBy.VALUE_DESC,
            show_values=True,
        )
        return CardDescriptor.from_card(CardName.BAR_CHART_CARD, props)


__all__ = ["RfmModule"]
