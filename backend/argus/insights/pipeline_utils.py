"""Shared pipeline-building utilities for insight modules.

Provides helpers to:

- Compute cutoff dates in Python (avoids ``$dateSubtract`` which is
  restricted on M0 Atlas clusters).
- Map expected field names to actual fields found in the sampled schema.
- Extract collection metadata from the sampled-schema dict.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any

# ---------------------------------------------------------------------------
# Date helpers (replace $dateSubtract)
# ---------------------------------------------------------------------------


def cutoff_iso(days: int) -> str:
    """Return an ISO 8601 string for *days* ago from now (UTC).

    MongoDB's ``$match`` accepts ``{"$gte": {"$date": "<iso>"}}`` when
    using the extended-JSON ``$date`` wrapper, but in plain JSON over
    MCP the safest approach is an ISODate-compatible string.  The
    ``mongodb-mcp-server`` ``aggregate`` tool treats ISO strings as
    dates when they appear in ``$match`` context.
    """
    dt = datetime.now(timezone.utc) - timedelta(days=days)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def cutoff_date_match(field: str, days: int) -> dict:
    """Build a ``$match`` stage that filters *field* >= *days* ago.

    Uses an ``$expr`` with ``$toDate`` to safely compare the field
    (which may be a BSON Date) against the calculated ISODate string,
    avoiding BSON type-mismatch failures.
    """
    return {
        "$match": {
            "$expr": {
                "$gte": [
                    f"${field}",
                    {"$toDate": cutoff_iso(days)}
                ]
            }
        }
    }


# ---------------------------------------------------------------------------
# Field-mapping heuristics
# ---------------------------------------------------------------------------

# Priority lists: first match wins.
_DATE_HINTS = [
    "createdAt", "created_at", "createdDate", "created_date",
    "timestamp", "date", "time", "ts",
    "updatedAt", "updated_at", "signup_date", "signupDate",
    "event_date", "eventDate", "occurred_at",
]

_ID_HINTS = [
    "user_id", "userId", "student_id", "studentId",
    "author_id", "authorId", "owner_id", "ownerId",
    "creator_id", "creatorId", "account_id", "accountId",
    "_id",
]

_NUMERIC_HINTS = [
    "amount", "total", "price", "cost", "revenue", "score",
    "count", "quantity", "value", "marks", "grade", "points",
    "__v",
]

_CATEGORICAL_HINTS = [
    "type", "category", "status", "channel", "source",
    "event_type", "eventType", "role", "plan", "tier",
    "schoolName", "school_name", "subject", "department",
    "country", "city", "region",
]


def _best_match(fields: list[str], hints: list[str]) -> str | None:
    """Return the first field that matches a hint (case-insensitive)."""
    lower_fields = {f.lower(): f for f in fields}
    for hint in hints:
        if hint.lower() in lower_fields:
            return lower_fields[hint.lower()]
    # Fuzzy: check if any hint is a substring of any field.
    for hint in hints:
        for lf, original in lower_fields.items():
            if hint.lower() in lf:
                return original
    return None


def find_date_field(fields: list[str]) -> str | None:
    """Find the best date/timestamp field in *fields*."""
    return _best_match(fields, _DATE_HINTS)


def find_id_field(fields: list[str]) -> str | None:
    """Find the best user/entity identifier field."""
    return _best_match(fields, _ID_HINTS)


def find_numeric_field(fields: list[str]) -> str | None:
    """Find a numeric-looking field suitable for aggregation metrics."""
    return _best_match(fields, _NUMERIC_HINTS)


def find_categorical_field(fields: list[str]) -> str | None:
    """Find a categorical/string field suitable for grouping."""
    return _best_match(fields, _CATEGORICAL_HINTS)


# ---------------------------------------------------------------------------
# Schema extraction
# ---------------------------------------------------------------------------


def get_collection_fields(
    sampled_schema: dict[str, Any],
    collection_name: str,
) -> list[str]:
    """Extract the field list for a collection from the sampled schema.

    The schema may be shaped as:
    - ``{collection_name: {"sample_fields": [...], ...}}``
    - ``{"collections": {collection_name: {"sample_fields": [...]}}}``
    - ``{"collections": [{name: ..., sample_fields: [...]}, ...]}``
    """
    # Direct key
    entry = sampled_schema.get(collection_name)
    if isinstance(entry, dict):
        return _fields_from_entry(entry)

    # Under "collections" dict
    collections = sampled_schema.get("collections")
    if isinstance(collections, dict):
        entry = collections.get(collection_name)
        if isinstance(entry, dict):
            return _fields_from_entry(entry)

    # Under "collections" list
    if isinstance(collections, list):
        for item in collections:
            if isinstance(item, dict) and item.get("name") == collection_name:
                return _fields_from_entry(item)

    return []


def get_all_collections(sampled_schema: dict[str, Any]) -> list[str]:
    """Return all collection names found in the sampled schema."""
    collections = sampled_schema.get("collections")
    if isinstance(collections, dict):
        return list(collections.keys())
    if isinstance(collections, list):
        return [
            item["name"]
            for item in collections
            if isinstance(item, dict) and "name" in item
        ]
    # Top-level keys that look like collections (have dict values with fields)
    names = []
    for k, v in sampled_schema.items():
        if isinstance(v, dict) and ("sample_fields" in v or "fields" in v or "doc_count" in v):
            names.append(k)
    return names


def _fields_from_entry(entry: dict) -> list[str]:
    """Pull the field list from a collection schema entry."""
    fields = entry.get("sample_fields") or entry.get("fields") or []
    if isinstance(fields, list):
        return [str(f) for f in fields]
    return []


__all__ = [
    "cutoff_iso",
    "cutoff_date_match",
    "find_date_field",
    "find_id_field",
    "find_numeric_field",
    "find_categorical_field",
    "get_collection_fields",
    "get_all_collections",
]
