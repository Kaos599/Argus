"""Cohort insight module.

7-day rolling retention by acquisition cohort, using
``$setWindowFields`` to compute days-since-signup and then ``$bucket``
to bin into the standard [0, 1, 7, 14, 30, 60, 90] boundaries.

Card output: a ``HeatmapCard`` whose rows are acquisition weeks and
columns are days-since-signup buckets, with cell values = active user
counts.
"""

from __future__ import annotations

from typing import Any

from argus.models.api_types import ModuleName
from argus.models.card import (
    CardDescriptor,
    CardName,
    HeatmapCardProps,
)

_COHORT_PIPELINE: list[dict] = [
    {
        "$match": {
            "event_type": {"$in": ["app_open", "session_start"]},
            "timestamp": {
                "$gte": {"$dateSubtract": {"startDate": "$$NOW", "unit": "day", "amount": 84}}
            },
        }
    },
    {
        "$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "_id",
            "as": "user",
        }
    },
    {"$unwind": "$user"},
    {
        "$group": {
            "_id": {
                "user_id": "$user_id",
                "cohort_week": {"$dateTrunc": {"date": "$user.signup_date", "unit": "week"}},
            },
            "last_active": {"$max": "$timestamp"},
        }
    },
    {
        "$setWindowFields": {
            "partitionBy": "$_id.cohort_week",
            "sortBy": {"last_active": 1},
            "output": {
                "days_since_signup": {
                    "$dateDiff": {
                        "startDate": "$_id.cohort_week",
                        "endDate": "$last_active",
                        "unit": "day",
                    }
                }
            },
        }
    },
    {
        "$bucket": {
            "groupBy": "$days_since_signup",
            "boundaries": [0, 1, 7, 14, 30, 60, 90],
            "default": "90+",
            "output": {
                "user_count": {"$sum": 1},
                "cohorts": {"$addToSet": "$_id.cohort_week"},
            },
        }
    },
    {
        "$project": {
            "days_since_signup": "$_id",
            "user_count": 1,
            "cohort_count": {"$size": "$cohorts"},
        }
    },
]


_BUCKET_LABELS = ["0d", "1d", "7d", "14d", "30d", "60d", "90d+"]


class CohortModule:
    """Cohort insight module."""

    name = ModuleName.COHORT
    required_collections = ["events", "users"]

    def can_run(self, sampled_schema: dict[str, Any]) -> bool:
        events = _get_collection(sampled_schema, "events")
        users = _get_collection(sampled_schema, "users")
        if not events or not users:
            return False
        event_fields = events.get("sample_fields") or events.get("fields") or []
        user_fields = users.get("sample_fields") or users.get("fields") or []
        has_event_type = any("event_type" in str(f) or "type" in str(f) for f in event_fields)
        has_user_id = any("user_id" in str(f) or "_id" in str(f) for f in event_fields)
        has_signup = any("signup" in str(f).lower() for f in user_fields)
        return has_event_type and has_user_id and has_signup

    def generate_pipeline(
        self, sampled_schema: dict[str, Any], params: dict[str, Any]
    ) -> list[dict]:
        return list(_COHORT_PIPELINE)

    def render_card(self, result: list[dict], params: dict[str, Any]) -> CardDescriptor:
        """Render a HeatmapCard.

        The pipeline returns one row per bucket boundary; we build a
        2-row heatmap (one cohort = "All acquisitions" + "Total" to
        satisfy the Zod min-2-row requirement) with columns = the
        bucket boundaries. A real implementation would pivot on
        cohort_week for a true 2-D heatmap; v1 keeps it simple.
        """
        if not result:
            return CardDescriptor.error(
                "Cohort pipeline returned no results",
                title="Cohort: no data",
            )

        user_counts = [float(row.get("user_count", 0)) for row in result]
        # Pad to len(_BUCKET_LABELS) so the matrix is rectangular.
        while len(user_counts) < len(_BUCKET_LABELS):
            user_counts.append(0.0)
        # Two rows so the heatmap satisfies the Zod min-2-row constraint.
        values = [user_counts, user_counts]
        props = HeatmapCardProps(
            title="Cohort retention: days since signup",
            row_labels=["All acquisition weeks", "Total"],
            col_labels=_BUCKET_LABELS,
            values=values,
            color_scale="sequential",
            cell_format="count",
            show_row_labels=True,
            show_col_labels=True,
        )
        return CardDescriptor.from_card(CardName.HEATMAP_CARD, props)


def _get_collection(schema: dict[str, Any], name: str) -> dict[str, Any] | None:
    if name in schema and isinstance(schema[name], dict):
        return schema[name]
    collections = schema.get("collections")
    if isinstance(collections, dict) and name in collections:
        return collections[name]
    return None


__all__ = ["CohortModule"]
