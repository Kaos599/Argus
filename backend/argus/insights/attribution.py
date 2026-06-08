"""Attribution insight module (v1: first-touch only).

For each user, find the first event in the events collection and
attribute them to the channel on that event. v2 will add Markov and
Shapley attribution.

Card output: a ``BarChartCard`` of top channels by attributed users.
"""

from __future__ import annotations

from typing import Any

from argus.insights.base import get_collection
from argus.models.api_types import ModuleName
from argus.models.card import (
    BarChartBar,
    BarChartCardProps,
    BarChartOrientation,
    BarChartSortBy,
    CardDescriptor,
    CardName,
)

_ATTRIBUTION_PIPELINE: list[dict] = [
    {"$match": {"event_type": {"$in": ["signup", "landing"]}}},
    {"$sort": {"timestamp": 1}},
    {
        "$group": {
            "_id": "$user_id",
            "first_channel": {"$first": "$channel"},
            "first_event_at": {"$first": "$timestamp"},
        }
    },
    {
        "$group": {
            "_id": "$first_channel",
            "user_count": {"$sum": 1},
            "earliest": {"$min": "$first_event_at"},
        }
    },
    {"$sort": {"user_count": -1}},
    {"$limit": 10},
]


class AttributionModule:
    """Attribution insight module (first-touch)."""

    name = ModuleName.ATTRIBUTION
    required_collections = ["events"]

    def can_run(self, sampled_schema: dict[str, Any]) -> bool:
        events = get_collection(sampled_schema, "events")
        if not events:
            return False
        fields = events.get("sample_fields") or events.get("fields") or []
        return any("channel" in str(f).lower() for f in fields)

    def generate_pipeline(
        self, sampled_schema: dict[str, Any], params: dict[str, Any]
    ) -> list[dict]:
        return list(_ATTRIBUTION_PIPELINE)

    def render_card(self, result: list[dict], params: dict[str, Any]) -> CardDescriptor:
        if not result:
            return CardDescriptor.error(
                "Attribution pipeline returned no results",
                title="Attribution: no data",
            )

        bars: list[BarChartBar] = [
            BarChartBar(
                label=str(row.get("_id") or "unknown"),
                value=float(row.get("user_count") or 0),
            )
            for row in result
        ]
        props = BarChartCardProps(
            title="Attribution: users by first-touch channel",
            orientation=BarChartOrientation.HORIZONTAL,
            bars=bars,
            sort_by=BarChartSortBy.VALUE_DESC,
            show_values=True,
        )
        return CardDescriptor.from_card(CardName.BAR_CHART_CARD, props)


__all__ = ["AttributionModule"]
