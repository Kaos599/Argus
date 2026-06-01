"""RFM insight module.

Revenue segmentation using ``$bucket``. Groups users into 5 fixed
revenue buckets and computes user count, total revenue, and average
orders per user per bucket.

Card output: a ``BarChartCard`` with one bar per bucket.
"""

from __future__ import annotations

from typing import Any

from argus.models.api_types import ModuleName
from argus.models.card import (
    BarChartBar,
    BarChartCardProps,
    BarChartOrientation,
    BarChartSortBy,
    CardDescriptor,
    CardName,
)

_RFM_PIPELINE: list[dict] = [
    {
        "$match": {
            "status": "completed",
            "created_at": {
                "$gte": {"$dateSubtract": {"startDate": "$$NOW", "unit": "month", "amount": 6}}
            },
        }
    },
    {
        "$group": {
            "_id": "$user_id",
            "total_spend": {"$sum": "$amount"},
            "order_count": {"$sum": 1},
            "last_order": {"$max": "$created_at"},
        }
    },
    {
        "$bucket": {
            "groupBy": "$total_spend",
            "boundaries": [0, 50, 200, 500, 1000, 100000],
            "default": "other",
            "output": {
                "user_count": {"$sum": 1},
                "total_revenue": {"$sum": "$total_spend"},
                "avg_orders_per_user": {"$avg": "$order_count"},
            },
        }
    },
    {
        "$project": {
            "bucket_range": {
                "$concat": [
                    {"$toString": {"$arrayElemAt": ["$_id", 0]}},
                    "-",
                    {"$toString": {"$arrayElemAt": ["$_id", 1]}},
                ]
            },
            "user_count": 1,
            "total_revenue": 1,
            "avg_orders_per_user": {"$round": ["$avg_orders_per_user", 2]},
        }
    },
]


class RfmModule:
    """RFM insight module."""

    name = ModuleName.RFM
    required_collections = ["orders"]

    def can_run(self, sampled_schema: dict[str, Any]) -> bool:
        orders = _get_collection(sampled_schema, "orders")
        if not orders:
            return False
        fields = orders.get("sample_fields") or orders.get("fields") or []
        return any("amount" in str(f).lower() for f in fields)

    def generate_pipeline(self, sampled_schema: dict[str, Any], params: dict[str, Any]) -> list[dict]:
        return list(_RFM_PIPELINE)

    def render_card(self, result: list[dict], params: dict[str, Any]) -> CardDescriptor:
        if not result:
            return CardDescriptor.error(
                "RFM pipeline returned no results",
                title="RFM: no data",
            )

        bars: list[BarChartBar] = []
        for row in result:
            label = str(row.get("bucket_range") or row.get("_id") or "?")
            value = float(row.get("user_count") or 0)
            bars.append(BarChartBar(label=label, value=value))

        props = BarChartCardProps(
            title="RFM: users by revenue bucket (last 6 months)",
            orientation=BarChartOrientation.VERTICAL,
            bars=bars,
            sort_by=BarChartSortBy.LABEL_ASC,
            show_values=True,
        )
        return CardDescriptor.from_card(CardName.BAR_CHART_CARD, props)


def _get_collection(schema: dict[str, Any], name: str) -> dict[str, Any] | None:
    if name in schema and isinstance(schema[name], dict):
        return schema[name]
    collections = schema.get("collections")
    if isinstance(collections, dict) and name in collections:
        return collections[name]
    return None


__all__ = ["RfmModule"]
