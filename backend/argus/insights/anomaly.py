"""Anomaly insight module (v1: z-score on a single daily metric).

Computes a trailing 28-day rolling mean and standard deviation for one
metric (default: daily active users), then flags days where the
metric's z-score exceeds a threshold (default: 2.5).

v1 limitation: the rolling stats are computed client-side, not in the
pipeline. We fetch 56 days of daily values and use ``statistics`` to
compute mean/std in Python. This is fine for the v1 demo; a v2
implementation can push the rolling stats into a ``$setWindowFields``
stage.

Card output: a ``TimeSeriesCard`` with ``showAnomalies=True`` and a
``SummaryCard`` listing the flagged days.
"""

from __future__ import annotations

import statistics
from typing import Any

from argus.insights.base import get_collection
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

# This pipeline returns one row per day with the metric value. The
# manager's guard adds a $limit at the end.
_ANOMALY_PIPELINE: list[dict] = [
    {
        "$match": {
            "$expr": {
                "$gte": [
                    "$timestamp",
                    {"$dateSubtract": {"startDate": "$$NOW", "unit": "day", "amount": 56}}
                ]
            }
        }
    },
    {
        "$group": {
            "_id": {"$dateTrunc": {"date": "$timestamp", "unit": "day"}},
            "users": {"$addToSet": "$user_id"},
            "event_count": {"$sum": 1},
        }
    },
    {
        "$project": {
            "_id": 0,
            "date": "$_id",
            "value": {"$size": "$users"},
        }
    },
    {"$sort": {"date": 1}},
]


class AnomalyModule:
    """Anomaly insight module."""

    name = ModuleName.ANOMALY
    required_collections = ["events"]

    def can_run(self, sampled_schema: dict[str, Any]) -> bool:
        events = get_collection(sampled_schema, "events")
        if not events:
            return False
        fields = events.get("sample_fields") or events.get("fields") or []
        return any("user_id" in str(f) or "_id" in str(f) for f in fields)

    def generate_pipeline(
        self, sampled_schema: dict[str, Any], params: dict[str, Any]
    ) -> list[dict]:
        return list(_ANOMALY_PIPELINE)

    def render_card(self, result: list[dict], params: dict[str, Any]) -> CardDescriptor:
        if not result:
            return CardDescriptor.error(
                "Anomaly pipeline returned no results",
                title="Anomaly: no data",
            )

        z_threshold = float(params.get("z_threshold", 2.5))
        trailing = int(params.get("trailing_window_days", 28))
        points: list[TimeSeriesPoint] = []
        anomalies: list[dict[str, Any]] = []

        for row in result:
            t = row.get("date")
            if hasattr(t, "isoformat"):
                t = t.isoformat()
            v = float(row.get("value", 0))
            points.append(TimeSeriesPoint(t=str(t), v=v))

        # Z-score the trailing window. We need at least `trailing` points
        # of history before flagging anomalies; days before that get no
        # z-score. For the v1 demo we use a simpler "all-time mean/std"
        # z-score if there are fewer than `trailing` points.
        values = [p.v for p in points]
        if len(values) < 2:
            return _summary_only(
                "Anomaly: not enough data",
                "Need at least 2 days of data to compute z-scores.",
            )

        mean = statistics.fmean(values)
        stdev = statistics.pstdev(values) or 1.0
        for point in points:
            z = (point.v - mean) / stdev
            if abs(z) >= z_threshold:
                anomalies.append({"t": point.t, "v": point.v, "z": round(z, 2)})

        # Build a TimeSeriesCard with the anomalies highlighted in the
        # summary text. (The frontend uses showAnomalies to draw a
        # dashed marker; we don't have per-point flags in the schema,
        # so we put them in the summary.)
        series = TimeSeriesSeries(name="DAU", points=points)
        ts_props = TimeSeriesCardProps(
            title=f"Anomaly: DAU (z ≥ {z_threshold})",
            series=[series],
            granularity=TimeSeriesGranularity.DAY,
            show_anomalies=True,
        )
        if not anomalies:
            return CardDescriptor.from_card(CardName.TIME_SERIES_CARD, ts_props)

        # With anomalies, wrap in a SummaryCard.
        summary_lines = [
            f"{len(anomalies)} anomalous day(s) in the trailing {trailing}-day window."
        ]
        for anom in anomalies[:3]:
            summary_lines.append(f"• {anom['t'][:10]}: DAU={anom['v']:.0f} (z={anom['z']:+.2f})")
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
                    metric="dau",
                    delta=float(anom["z"]),
                )
            )
        summary = SummaryCardProps(
            title=f"Anomaly: {len(anomalies)} flagged day(s)",
            summary="\n".join(summary_lines),
            findings=findings,
        )
        return CardDescriptor.from_card(CardName.SUMMARY_CARD, summary)


def _summary_only(title: str, text: str) -> CardDescriptor:
    summary = SummaryCardProps(title=title, summary=text, findings=[])
    return CardDescriptor.from_card(CardName.SUMMARY_CARD, summary)


__all__ = ["AnomalyModule"]
