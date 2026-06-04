"""Card renderer — turns an insight module's raw result into a ``CardDescriptor``.

The renderer is a thin layer over the per-module ``render_card``
methods, with two extras:

- ``render_error`` — builds an ``ErrorCard`` descriptor for any failure.
- ``get_module`` / ``all_modules`` — module registry used by the
  planner and the API layer.
"""

from __future__ import annotations

from argus.insights.anomaly import AnomalyModule
from argus.insights.attribution import AttributionModule
from argus.insights.base import InsightModule
from argus.insights.cohort import CohortModule
from argus.insights.funnel import FunnelModule
from argus.insights.rfm import RfmModule
from argus.models.api_types import ModuleName
from argus.models.card import CardDescriptor, CardName, ErrorCardProps

# Singleton registry. Order matches the 5-module order in the spec.
_MODULES: list[InsightModule] = [
    FunnelModule(),
    CohortModule(),
    RfmModule(),
    AttributionModule(),
    AnomalyModule(),
]

_BY_NAME: dict[ModuleName, InsightModule] = {m.name: m for m in _MODULES}


def all_modules() -> list[InsightModule]:
    return list(_MODULES)


def get_module(name: ModuleName) -> InsightModule:
    """Return the module implementation for a given name.

    Raises ``KeyError`` if the name is unknown.
    """
    return _BY_NAME[name]


# ---------------------------------------------------------------------------
# Error card
# ---------------------------------------------------------------------------


def render_error(
    message: str,
    *,
    title: str = "Something went wrong",
    error_code: str | None = None,
    technical_details: str | None = None,
    is_retryable: bool = True,
    is_read_only_violation: bool = False,
    guidance: str | None = None,
) -> CardDescriptor:
    """Build an ``ErrorCard`` descriptor for any failure path."""
    return CardDescriptor.from_card(
        CardName.ERROR_CARD,
        ErrorCardProps(
            title=title,
            message=message,
            error_code=error_code,
            technical_details=technical_details,
            is_retryable=is_retryable,
            is_read_only_violation=is_read_only_violation,
            guidance=guidance,
        ),
    )


__all__ = [
    "all_modules",
    "get_module",
    "render_error",
]
