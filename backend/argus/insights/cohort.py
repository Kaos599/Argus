"""Cohort insight module — schema-aware pipeline generation.

Produces a **TimeSeriesCard** showing document activity over time.

The pipeline avoids M0-restricted operators (``$dateTrunc``,
``$dateDiff``, ``$bucket``, ``$lookup``, ``$setWindowFields``)
and instead uses ``$dateToString`` + ``$group`` to build daily
aggregates that work on all MongoDB Atlas tiers.
"""

from __future__ import annotations

from typing import Any

from argus.insights.pipeline_utils import (
    cutoff_date_match,
    find_date_field,
    find_id_field,
    get_collection_fields,
)
from argus.models.api_types import ModuleName
from argus.models.card import (
    CardDescriptor,
    CardName,
    HeatmapCardProps,
    SummaryCardProps,
    SummaryFinding,
    SummaryFindingSeverity,
    TimeSeriesCardProps,
    TimeSeriesGranularity,
    TimeSeriesPoint,
    TimeSeriesSeries,
)


class CohortModule:
    """Cohort insight module."""

    name = ModuleName.COHORT
    required_collections = ["events", "users"]

    def can_run(self, sampled_schema: dict[str, Any]) -> bool:
        """Return True if all required collections are present in the schema."""
        return all(coll in sampled_schema for coll in self.required_collections)

    def generate_pipeline(
        self, sampled_schema: dict[str, Any], params: dict[str, Any]
    ) -> list[dict]:
        """Build a schema-aware cohort pipeline.

        Strategy: group documents by day using ``$dateToString``
        (universally supported) instead of ``$dateTrunc``. Counts
        documents per day, and optionally counts distinct users if
        an ID field is available.
        """
        collection = params.get("collection") or "users"
        fields = params.get("fields") or get_collection_fields(sampled_schema, collection)
        lookback = int(params.get("lookback_days", 90))

        date_field = find_date_field(fields)
        id_field = find_id_field(fields)

        if not date_field:
            # Absolute fallback: just count documents
            return [{"$count": "count"}]

        pipeline: list[dict] = []

        # 1) Date filter
        pipeline.append(cutoff_date_match(date_field, lookback))

        # 2) Group by day (using $dateToString instead of $dateTrunc)
        group_stage: dict[str, Any] = {
            "_id": {
                "$dateToString": {
                    "format": "%Y-%m-%d",
                    "date": f"${date_field}",
                }
            },
            "count": {"$sum": 1},
        }
        if id_field and id_field != "_id":
            group_stage["unique_ids"] = {"$addToSet": f"${id_field}"}

        pipeline.append({"$group": group_stage})

        # 3) Project to clean shape
        project: dict[str, Any] = {
            "_id": 0,
            "date": "$_id",
            "count": 1,
        }
        if id_field and id_field != "_id":
            project["unique_count"] = {"$size": "$unique_ids"}
        pipeline.append({"$project": project})

        # 4) Sort by date
        pipeline.append({"$sort": {"date": 1}})

        return pipeline

    def render_card(self, result: list[dict], params: dict[str, Any]) -> CardDescriptor:
        """Render a TimeSeriesCard from the daily-grouped result."""
        if not result:
            return CardDescriptor.error(
                "Cohort pipeline returned no results",
                title="Cohort: no data",
            )

        collection = params.get("collection", "data")

        # Simple $count fallback
        if len(result) == 1 and "count" in result[0] and "date" not in result[0]:
            total = int(result[0]["count"])
            summary = SummaryCardProps(
                title=f"Cohort: {collection}",
                summary=f"{total:,} documents in {collection}.",
                findings=[
                    SummaryFinding(
                        text=f"{total:,} total documents",
                        severity=SummaryFindingSeverity.INFO,
                        metric="total_count",
                    )
                ],
            )
            return CardDescriptor.from_card(CardName.SUMMARY_CARD, summary)

        # Retention heatmap format: {"_id": day_offset, "user_count": N}
        if "user_count" in result[0] and isinstance(result[0].get("_id"), (int, float)):
            day0 = float(result[0].get("user_count", 1)) or 1
            row_labels = [f"Day {int(row['_id'])}" for row in result]
            # Pad to min_length=2 if needed
            if len(row_labels) < 2:
                row_labels.append("Day ?")
            values = [
                [
                    float(row.get("user_count", 0)),
                    round(float(row.get("user_count", 0)) / day0 * 100, 1),
                ]
                for row in result
            ]
            if len(values) < 2:
                values.append([0.0, 0.0])
            heatmap = HeatmapCardProps(
                title=f"Cohort retention ({collection})",
                rowLabels=row_labels,
                colLabels=["Users", "% Retained"],
                values=values,
            )
            return CardDescriptor.from_card(CardName.HEATMAP_CARD, heatmap)

        # Build time series
        metric_key = "unique_count" if any("unique_count" in row for row in result) else "count"
        metric_label = "Unique Users" if metric_key == "unique_count" else "Documents"

        points: list[TimeSeriesPoint] = []
        for row in result:
            date_str = str(row.get("date", ""))
            value = float(row.get(metric_key, row.get("count", 0)))
            if date_str:
                points.append(TimeSeriesPoint(t=date_str, v=value))

        if not points:
            return CardDescriptor.error(
                "No data points to chart",
                title="Cohort: no data",
            )

        series = TimeSeriesSeries(name=metric_label, points=points)
        ts_props = TimeSeriesCardProps(
            title=f"Cohort: {metric_label} per day ({collection})",
            series=[series],
            granularity=TimeSeriesGranularity.DAY,
        )
        return CardDescriptor.from_card(CardName.TIME_SERIES_CARD, ts_props)


__all__ = ["CohortModule"]
