"""Pydantic v2 models for the 7 card types.

These mirror `shared/api-types.ts` (the source of truth) and the Zod
schemas in `research/14-zod-schemas.md`. The TypeScript file stays
authoritative; if you change a field here, also update the TS file.

Field names use snake_case to match the Zod schemas, which use
snake_case (e.g., `component_name`, `delta_window`, `comparison_text`).
"""

from __future__ import annotations

from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class _CardModel(BaseModel):
    """Base for all card prop models. Permissive config so optional
    fields with `default` mirror Zod's `.default()` behavior."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)


# ---------------------------------------------------------------------------
# 1. StatCard
# ---------------------------------------------------------------------------


class StatCardUnit(str, Enum):
    EMPTY = ""
    COUNT = "count"
    PERCENT = "percent"
    USD = "usd"
    EUR = "eur"
    GBP = "gbp"
    DAYS = "days"
    HOURS = "hours"


class StatDeltaWindow(str, Enum):
    DAY = "day"
    WEEK = "week"
    MONTH = "month"


class StatTrend(str, Enum):
    UP = "up"
    DOWN = "down"
    FLAT = "flat"


class StatCardProps(_CardModel):
    label: str = Field(..., description='Human-readable label, e.g. "Active users"')
    value: float = Field(..., description="The numeric value")
    unit: StatCardUnit | None = None
    delta: float | None = Field(
        default=None, description="Optional change from previous period (signed)"
    )
    delta_window: StatDeltaWindow | None = Field(default=None, alias="deltaWindow")
    trend: StatTrend | None = None
    comparison_text: str | None = Field(default=None, alias="comparisonText")


# ---------------------------------------------------------------------------
# 2. TimeSeriesCard
# ---------------------------------------------------------------------------


class TimeSeriesColor(str, Enum):
    PRIMARY = "primary"
    SECONDARY = "secondary"
    SUCCESS = "success"
    WARNING = "warning"
    DANGER = "danger"


class TimeSeriesPoint(_CardModel):
    t: str = Field(..., description="ISO 8601 timestamp")
    v: float


class TimeSeriesSeries(_CardModel):
    name: str
    points: list[TimeSeriesPoint] = Field(..., min_length=1)
    color: TimeSeriesColor | None = None


class TimeSeriesGranularity(str, Enum):
    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"


class TimeSeriesCardProps(_CardModel):
    title: str
    series: list[TimeSeriesSeries] = Field(..., min_length=1)
    x_axis_label: str | None = Field(default=None, alias="xAxisLabel")
    y_axis_label: str | None = Field(default=None, alias="yAxisLabel")
    granularity: TimeSeriesGranularity | None = None
    show_anomalies: bool | None = Field(default=None, alias="showAnomalies")


# ---------------------------------------------------------------------------
# 3. BarChartCard
# ---------------------------------------------------------------------------


class BarChartOrientation(str, Enum):
    VERTICAL = "vertical"
    HORIZONTAL = "horizontal"


class BarChartSortBy(str, Enum):
    VALUE_DESC = "value-desc"
    VALUE_ASC = "value-asc"
    LABEL_ASC = "label-asc"


class BarChartBar(_CardModel):
    label: str
    value: float
    color: TimeSeriesColor | None = None


class BarChartCardProps(_CardModel):
    title: str
    orientation: BarChartOrientation = BarChartOrientation.VERTICAL
    bars: list[BarChartBar] = Field(..., min_length=1, max_length=20)
    x_axis_label: str | None = Field(default=None, alias="xAxisLabel")
    y_axis_label: str | None = Field(default=None, alias="yAxisLabel")
    sort_by: BarChartSortBy = Field(default=BarChartSortBy.VALUE_DESC, alias="sortBy")
    show_values: bool = Field(default=True, alias="showValues")


# ---------------------------------------------------------------------------
# 4. HeatmapCard
# ---------------------------------------------------------------------------


class HeatmapColorScale(str, Enum):
    SEQUENTIAL = "sequential"
    DIVERGING = "diverging"


class HeatmapCellFormat(str, Enum):
    COUNT = "count"
    PERCENT = "percent"
    USD = "usd"


class HeatmapCardProps(_CardModel):
    title: str
    row_labels: list[str] = Field(..., min_length=2, max_length=20, alias="rowLabels")
    col_labels: list[str] = Field(..., min_length=2, max_length=20, alias="colLabels")
    values: list[list[float]]
    color_scale: HeatmapColorScale = Field(
        default=HeatmapColorScale.SEQUENTIAL, alias="colorScale"
    )
    color_domain: tuple[float, float] | None = Field(default=None, alias="colorDomain")
    cell_format: HeatmapCellFormat = Field(default=HeatmapCellFormat.COUNT, alias="cellFormat")
    show_row_labels: bool = Field(default=True, alias="showRowLabels")
    show_col_labels: bool = Field(default=True, alias="showColLabels")


# ---------------------------------------------------------------------------
# 5. TableCard
# ---------------------------------------------------------------------------


class TableColumnFormat(str, Enum):
    TEXT = "text"
    NUMBER = "number"
    PERCENT = "percent"
    USD = "usd"
    DATE = "date"
    DATETIME = "datetime"


class TableColumnAlign(str, Enum):
    LEFT = "left"
    CENTER = "center"
    RIGHT = "right"


class TableColumn(_CardModel):
    key: str
    label: str
    format: TableColumnFormat = TableColumnFormat.TEXT
    sortable: bool = True
    align: TableColumnAlign = TableColumnAlign.LEFT


# A table row is a dict of {column_key: string|number|null}
TableRow = dict[str, str | float | int | None]


class TableCardProps(_CardModel):
    title: str
    columns: list[TableColumn] = Field(..., min_length=1, max_length=10)
    rows: list[TableRow] = Field(..., min_length=1, max_length=1000)
    page_size: int = Field(default=25, ge=10, le=100, alias="pageSize")
    enable_search: bool = Field(default=True, alias="enableSearch")
    enable_export: bool = Field(default=True, alias="enableExport")


# ---------------------------------------------------------------------------
# 6. SummaryCard
# ---------------------------------------------------------------------------


class SummaryFindingSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class SummaryFinding(_CardModel):
    text: str
    severity: SummaryFindingSeverity = SummaryFindingSeverity.INFO
    metric: str | None = None
    delta: float | None = None


class SummaryCardProps(_CardModel):
    title: str
    summary: str
    findings: list[SummaryFinding] = Field(default_factory=list, max_length=5)
    suggested_actions: list[str] | None = Field(default=None, alias="suggestedActions", max_length=3)
    # related_card is a union of StatCardProps | TimeSeriesCardProps | BarChartCardProps
    # We use a permissive dict here; the renderer fills in the right shape.
    related_card: StatCardProps | TimeSeriesCardProps | BarChartCardProps | None = Field(
        default=None, alias="relatedCard"
    )


# ---------------------------------------------------------------------------
# 7. ErrorCard
# ---------------------------------------------------------------------------


class ErrorCardProps(_CardModel):
    title: str = "Something went wrong"
    message: str
    error_code: str | None = Field(default=None, alias="errorCode")
    technical_details: str | None = Field(default=None, alias="technicalDetails")
    is_retryable: bool = Field(default=True, alias="isRetryable")
    is_read_only_violation: bool = Field(default=False, alias="isReadOnlyViolation")
    guidance: str | None = None


# ---------------------------------------------------------------------------
# CardDescriptor — the union envelope
# ---------------------------------------------------------------------------


class CardName(str, Enum):
    """The 7 card types. Mirrors `CardName` in shared/api-types.ts."""

    STAT_CARD = "StatCard"
    TIME_SERIES_CARD = "TimeSeriesCard"
    BAR_CHART_CARD = "BarChartCard"
    HEATMAP_CARD = "HeatmapCard"
    TABLE_CARD = "TableCard"
    SUMMARY_CARD = "SummaryCard"
    ERROR_CARD = "ErrorCard"


# Discriminated union keyed by component_name. Frontend uses
# `component_name` to pick the React component, then validates `props`
# against the matching Zod schema.
_CardPropsUnion = Annotated[
    StatCardProps
    | TimeSeriesCardProps
    | BarChartCardProps
    | HeatmapCardProps
    | TableCardProps
    | SummaryCardProps
    | ErrorCardProps,
    Field(discriminator=None),  # Pydantic v2 doesn't have native discriminators here
]


class CardDescriptor(BaseModel):
    """The descriptor envelope: a component name + its props.

    The frontend dispatches on `component_name` to render the right
    React component with the supplied props.
    """

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    component_name: CardName = Field(..., alias="componentName")
    props: dict = Field(default_factory=dict)

    @classmethod
    def from_card(cls, card_name: CardName, props: _CardModel) -> CardDescriptor:
        """Helper to build a descriptor from a typed card prop model.

        Serializes the props model to a dict (preserving snake_case
        → camelCase aliases) and wraps it in the descriptor.
        """
        return cls(component_name=card_name, props=props.model_dump(by_alias=True, exclude_none=False))

    @classmethod
    def error(
        cls,
        message: str,
        *,
        title: str = "Something went wrong",
        error_code: str | None = None,
        technical_details: str | None = None,
        is_retryable: bool = True,
        is_read_only_violation: bool = False,
        guidance: str | None = None,
    ) -> CardDescriptor:
        """Convenience constructor for an ErrorCard descriptor."""
        return cls.from_card(
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
    "CardDescriptor",
    "CardName",
    "StatCardProps",
    "TimeSeriesCardProps",
    "BarChartCardProps",
    "HeatmapCardProps",
    "TableCardProps",
    "SummaryCardProps",
    "ErrorCardProps",
    # Sub-models
    "TimeSeriesPoint",
    "TimeSeriesSeries",
    "BarChartBar",
    "TableColumn",
    "SummaryFinding",
    # Enums
    "StatCardUnit",
    "StatDeltaWindow",
    "StatTrend",
    "TimeSeriesColor",
    "TimeSeriesGranularity",
    "BarChartOrientation",
    "BarChartSortBy",
    "HeatmapColorScale",
    "HeatmapCellFormat",
    "TableColumnFormat",
    "TableColumnAlign",
    "SummaryFindingSeverity",
]


# A re-export so type checkers can pick up the union
def _card_props_union() -> StatCardProps | TimeSeriesCardProps | BarChartCardProps | HeatmapCardProps | TableCardProps | SummaryCardProps | ErrorCardProps:  # pragma: no cover
    """Static type helper for the card props union."""
    raise NotImplementedError
