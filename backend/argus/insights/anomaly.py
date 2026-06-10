"""Anomaly insight module — schema-aware pipeline generation.

Produces a **TimeSeriesCard** with z-score anomaly detection on
a daily metric. The rolling stats are computed client-side in Python.

The pipeline avoids M0-restricted operators (``$dateTrunc``,
``$dateSubtract``, ``$setWindowFields``) and uses ``$dateToString``
+ ``$group`` for daily aggregation.
"""

from __future__ import annotations

import statistics
from typing import Any

from argus.insights.pipeline_utils import (
    cutoff_date_match,
    find_date_field,
    find_id_field,
    get_collection_fields,
    get_all_collections,
)
from argus.models.api_types import ModuleName
from argus.models.card import (
    CardDescriptor,
    CardName,
    SummaryCardProps,
    SummaryFinding,
    SummaryFindingSeverity,
    TimeSeriesCardProps,
    TimeSeriesGranularity,
    TimeSeriesPoint,
    TimeSeriesSeries,
)


class AnomalyModule:
    """Anomaly insight module."""

    name = ModuleName.ANOMALY
    required_collections = ["events"]

    def can_run(self, sampled_schema: dict[str, Any]) -> bool:
        """Return True if any collection has a date field."""
        for coll in get_all_collections(sampled_schema):
            fields = get_collection_fields(sampled_schema, coll)
            if find_date_field(fields):
                return True
        return False

    def generate_pipeline(
        self, sampled_schema: dict[str, Any], params: dict[str, Any]
    ) -> list[dict]:
        """Build a schema-aware anomaly pipeline.

        Groups documents by day using ``$dateToString`` (avoids
        ``$dateTrunc``) and counts documents per day. If a user/entity
        ID field exists, also counts distinct entities.
        """
        collection = params.get("collection") or "users"
        fields = params.get("fields") or get_collection_fields(sampled_schema, collection)
        lookback = int(params.get("lookback_days", 56))

        date_field = find_date_field(fields)
        id_field = find_id_field(fields)

        if not date_field:
            return [{"$count": "count"}]

        pipeline: list[dict] = []

        # 1) Date filter
        pipeline.append(cutoff_date_match(date_field, lookback))

        # 2) Group by day using $dateToString
        group_stage: dict[str, Any] = {
            "_id": {
                "$dateToString": {
                    "format": "%Y-%m-%d",
                    "date": f"${date_field}",
                }
            },
            "event_count": {"$sum": 1},
        }
        if id_field and id_field != "_id":
            group_stage["users"] = {"$addToSet": f"${id_field}"}

        pipeline.append({"$group": group_stage})

        # 3) Project to clean shape
        project: dict[str, Any] = {
            "_id": 0,
            "date": "$_id",
            "event_count": 1,
        }
        if id_field and id_field != "_id":
            project["value"] = {"$size": "$users"}
        else:
            project["value"] = "$event_count"

        pipeline.append({"$project": project})

        # 4) Sort by date
        pipeline.append({"$sort": {"date": 1}})

        return pipeline

    def render_card(self, result: list[dict], params: dict[str, Any]) -> CardDescriptor:
        """Render a TimeSeriesCard with z-score anomaly detection."""
        if not result:
            return CardDescriptor.error(
                "Anomaly pipeline returned no results",
                title="Anomaly: no data",
            )

        # Handle simple $count fallback
        if len(result) == 1 and "count" in result[0] and "date" not in result[0]:
            total = int(result[0]["count"])
            summary = SummaryCardProps(
                title="Anomaly: not enough data",
                summary=f"Only {total:,} documents found. Need time-series data for anomaly detection.",
                findings=[],
            )
            return CardDescriptor.from_card(CardName.SUMMARY_CARD, summary)

        z_threshold = float(params.get("z_threshold", 2.5))
        trailing = int(params.get("trailing_window_days", 28))
        collection = params.get("collection", "data")

        points: list[TimeSeriesPoint] = []
        for row in result:
            t = row.get("date")
            if hasattr(t, "isoformat"):
                t = t.isoformat()
            v = float(row.get("value", row.get("event_count", 0)))
            points.append(TimeSeriesPoint(t=str(t), v=v))

        if len(points) < 2:
            return _summary_only(
                "Anomaly: not enough data",
                "Need at least 2 days of data to compute z-scores.",
            )

        # Z-score computation
        values = [p.v for p in points]
        mean = statistics.fmean(values)
        stdev = statistics.pstdev(values) or 1.0

        anomalies: list[dict[str, Any]] = []
        for point in points:
            z = (point.v - mean) / stdev
            if abs(z) >= z_threshold:
                anomalies.append({"t": point.t, "v": point.v, "z": round(z, 2)})

        metric_label = "Activity"
        series = TimeSeriesSeries(name=metric_label, points=points)
        ts_props = TimeSeriesCardProps(
            title=f"Anomaly: {metric_label} per day ({collection}, z ≥ {z_threshold})",
            series=[series],
            granularity=TimeSeriesGranularity.DAY,
            show_anomalies=bool(anomalies),
        )

        if not anomalies:
            return CardDescriptor.from_card(CardName.TIME_SERIES_CARD, ts_props)

        # With anomalies, wrap in a SummaryCard
        summary_lines = [
            f"{len(anomalies)} anomalous day(s) detected."
        ]
        for anom in anomalies[:3]:
            summary_lines.append(
                f"• {anom['t'][:10]}: value={anom['v']:.0f} (z={anom['z']:+.2f})"
            )
        findings: list[SummaryFinding] = []
        for anom in anomalies[:5]:
            severity = (
                SummaryFindingSeverity.CRITICAL
                if abs(anom["z"]) >= 4
                else SummaryFindingSeverity.WARNING
            )
            findings.append(
                SummaryFinding(
                    text=f"{anom['t'][:10]}: z={anom['z']:+.2f}",
                    severity=severity,
                    metric="activity",
                    delta=float(anom["z"]),
                )
            )
        summary = SummaryCardProps(
            title=f"Anomaly: {len(anomalies)} flagged day(s) in {collection}",
            summary="\n".join(summary_lines),
            findings=findings,
        )
        return CardDescriptor.from_card(CardName.SUMMARY_CARD, summary)


def _summary_only(title: str, text: str) -> CardDescriptor:
    summary = SummaryCardProps(title=title, summary=text, findings=[])
    return CardDescriptor.from_card(CardName.SUMMARY_CARD, summary)


__all__ = ["AnomalyModule"]
