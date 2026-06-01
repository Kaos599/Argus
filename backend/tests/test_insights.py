"""Tests for the 5 insight modules.

Each module must:
1. ``generate_pipeline`` returns a valid MQL pipeline.
2. ``render_card`` produces a valid ``CardDescriptor``.
3. The pipeline passes the result-set guard.
"""

from __future__ import annotations

from datetime import UTC

import pytest

from argus.guard.result_set_guard import validate_pipeline
from argus.insights.anomaly import AnomalyModule
from argus.insights.attribution import AttributionModule
from argus.insights.base import load_cookbook
from argus.insights.card_renderer import all_modules, get_module
from argus.insights.cohort import CohortModule
from argus.insights.funnel import FunnelModule
from argus.insights.rfm import RfmModule
from argus.models.api_types import ModuleName
from argus.models.card import (
    CardDescriptor,
    CardName,
)

# A schema sample that satisfies all 5 modules.
RICH_SCHEMA: dict = {
    "users": {
        "name": "users",
        "doc_count": 1000,
        "sample_fields": [
            "_id",
            "email",
            "signup_date",
            "country",
            "activated",
            "first_purchase_amount",
            "first_purchase_at",
        ],
    },
    "orders": {
        "name": "orders",
        "doc_count": 5000,
        "sample_fields": ["_id", "user_id", "amount", "status", "created_at"],
    },
    "events": {
        "name": "events",
        "doc_count": 50_000,
        "sample_fields": ["_id", "user_id", "event_type", "timestamp", "channel"],
    },
}

# A schema that intentionally lacks the events collection to test
# ``can_run`` rejection.
SPARSE_SCHEMA: dict = {
    "users": {
        "name": "users",
        "doc_count": 100,
        "sample_fields": ["_id", "email"],
    },
}


# ---------------------------------------------------------------------------
# Module registry
# ---------------------------------------------------------------------------


class TestRegistry:
    def test_all_5_modules_registered(self) -> None:
        modules = all_modules()
        assert len(modules) == 5
        names = {m.name for m in modules}
        assert names == set(ModuleName)

    def test_get_module_known(self) -> None:
        for name in ModuleName:
            mod = get_module(name)
            assert mod.name == name

    def test_load_cookbook_for_every_module(self) -> None:
        for name in ModuleName:
            meta = load_cookbook(name)
            assert meta.name == name
            assert meta.description
            assert meta.required_collections


# ---------------------------------------------------------------------------
# can_run
# ---------------------------------------------------------------------------


class TestCanRun:
    def test_funnel_with_rich_schema(self) -> None:
        assert FunnelModule().can_run(RICH_SCHEMA)

    def test_funnel_without_country(self) -> None:
        schema = {
            **RICH_SCHEMA,
            "users": {**RICH_SCHEMA["users"], "sample_fields": ["_id", "email"]},
        }
        # Without country, the funnel can't be sure it has the right fields.
        assert not FunnelModule().can_run(schema)

    def test_cohort_with_rich_schema(self) -> None:
        assert CohortModule().can_run(RICH_SCHEMA)

    def test_cohort_without_users_collection(self) -> None:
        schema = {k: v for k, v in RICH_SCHEMA.items() if k != "users"}
        assert not CohortModule().can_run(schema)

    def test_rfm_with_orders(self) -> None:
        assert RfmModule().can_run(RICH_SCHEMA)

    def test_rfm_without_orders(self) -> None:
        schema = {k: v for k, v in RICH_SCHEMA.items() if k != "orders"}
        assert not RfmModule().can_run(schema)

    def test_attribution_with_events(self) -> None:
        assert AttributionModule().can_run(RICH_SCHEMA)

    def test_attribution_without_channel(self) -> None:
        schema = {
            **RICH_SCHEMA,
            "events": {
                **RICH_SCHEMA["events"],
                "sample_fields": ["_id", "user_id", "event_type", "timestamp"],
            },
        }
        assert not AttributionModule().can_run(schema)

    def test_anomaly_with_events(self) -> None:
        assert AnomalyModule().can_run(RICH_SCHEMA)

    def test_sparse_schema(self) -> None:
        # Only users — most modules should reject.
        assert not FunnelModule().can_run(SPARSE_SCHEMA)
        assert not CohortModule().can_run(SPARSE_SCHEMA)
        assert not RfmModule().can_run(SPARSE_SCHEMA)
        assert not AttributionModule().can_run(SPARSE_SCHEMA)
        assert not AnomalyModule().can_run(SPARSE_SCHEMA)


# ---------------------------------------------------------------------------
# generate_pipeline — every module produces a pipeline that passes the guard
# ---------------------------------------------------------------------------


class TestGeneratePipeline:
    @pytest.mark.parametrize("module_name", list(ModuleName))
    def test_pipeline_passes_guard(self, module_name: ModuleName) -> None:
        module = get_module(module_name)
        pipeline = module.generate_pipeline(RICH_SCHEMA, {})
        # Should not raise.
        out = validate_pipeline(pipeline)
        assert isinstance(out, list)
        assert len(out) > 0

    @pytest.mark.parametrize("module_name", list(ModuleName))
    def test_pipeline_ends_with_implicit_limit_at_call_site(self, module_name: ModuleName) -> None:
        # The guard adds a $limit at the call site, not at generate_pipeline time.
        # The test ensures the pipeline itself is "pure" (no $out / $merge).
        module = get_module(module_name)
        pipeline = module.generate_pipeline(RICH_SCHEMA, {})
        forbidden = {"$out", "$merge"}
        for stage in pipeline:
            assert not (set(stage.keys()) & forbidden), f"{module_name} produced a forbidden stage"


# ---------------------------------------------------------------------------
# render_card — every module returns a valid CardDescriptor
# ---------------------------------------------------------------------------


class TestRenderCard:
    def test_funnel_renders_summary_card(self) -> None:
        result = [
            {
                "signups": [{"count": 47}],
                "activations": [{"count": 31}],
                "revenue": [{"_id": None, "total": 1234.5}],
                "by_country": [
                    {"_id": "US", "count": 22},
                    {"_id": "DE", "count": 8},
                ],
            }
        ]
        card = FunnelModule().render_card(result, {})
        assert isinstance(card, CardDescriptor)
        assert card.component_name == CardName.SUMMARY_CARD
        assert "summary" in card.props
        # Findings should mention signups.
        findings = card.props.get("findings", [])
        assert any("47" in str(f.get("text", "")) for f in findings)

    def test_funnel_handles_empty_result(self) -> None:
        card = FunnelModule().render_card([], {})
        assert card.component_name == CardName.ERROR_CARD

    def test_cohort_renders_heatmap(self) -> None:
        result = [
            {"_id": 0, "user_count": 100},
            {"_id": 1, "user_count": 50},
            {"_id": 7, "user_count": 25},
        ]
        card = CohortModule().render_card(result, {})
        assert card.component_name == CardName.HEATMAP_CARD
        # Heatmap props: rowLabels, colLabels, values (camelCase per Zod)
        assert "rowLabels" in card.props
        assert "colLabels" in card.props
        assert "values" in card.props

    def test_rfm_renders_bar_chart(self) -> None:
        result = [
            {"_id": [0, 50], "bucket_range": "0-50", "user_count": 423},
            {"_id": [50, 200], "bucket_range": "50-200", "user_count": 187},
        ]
        card = RfmModule().render_card(result, {})
        assert card.component_name == CardName.BAR_CHART_CARD
        bars = card.props.get("bars", [])
        assert len(bars) == 2
        assert bars[0]["label"] == "0-50"

    def test_attribution_renders_bar_chart(self) -> None:
        result = [
            {"_id": "organic", "user_count": 412},
            {"_id": "paid", "user_count": 287},
        ]
        card = AttributionModule().render_card(result, {})
        assert card.component_name == CardName.BAR_CHART_CARD

    def test_anomaly_renders_with_no_anomalies(self) -> None:
        # 30 days of stable values — no anomaly.
        from datetime import datetime, timedelta

        result = [
            {
                "date": (datetime(2026, 5, 1, tzinfo=UTC) + timedelta(days=i)).isoformat(),
                "value": 100.0 + (i % 3),
            }
            for i in range(30)
        ]
        card = AnomalyModule().render_card(result, {})
        assert card.component_name == CardName.TIME_SERIES_CARD

    def test_anomaly_renders_with_anomalies(self) -> None:
        from datetime import datetime, timedelta

        # 28 stable days + 1 spike
        result = [
            {
                "date": (datetime(2026, 5, 1, tzinfo=UTC) + timedelta(days=i)).isoformat(),
                "value": 100.0,
            }
            for i in range(28)
        ]
        result.append(
            {
                "date": (datetime(2026, 5, 1, tzinfo=UTC) + timedelta(days=28)).isoformat(),
                "value": 10_000.0,  # massive spike
            }
        )
        card = AnomalyModule().render_card(result, {})
        # Anomalies present — should wrap in SummaryCard
        assert card.component_name == CardName.SUMMARY_CARD
        findings = card.props.get("findings", [])
        assert len(findings) > 0

    def test_all_modules_return_card_descriptor(self) -> None:
        """Smoke test: each module returns a CardDescriptor for a
        representative result."""
        cases = {
            ModuleName.FUNNEL: [
                {"signups": [{"count": 10}], "activations": [], "revenue": [], "by_country": []}
            ],
            ModuleName.COHORT: [{"_id": 0, "user_count": 5}],
            ModuleName.RFM: [{"_id": [0, 50], "bucket_range": "0-50", "user_count": 5}],
            ModuleName.ATTRIBUTION: [{"_id": "organic", "user_count": 5}],
            ModuleName.ANOMALY: [
                {"date": "2026-05-01T00:00:00Z", "value": 100.0},
                {"date": "2026-05-02T00:00:00Z", "value": 105.0},
            ],
        }
        for name, result in cases.items():
            module = get_module(name)
            card = module.render_card(result, {})
            assert isinstance(card, CardDescriptor), f"{name} returned {type(card)}"
            assert card.component_name in set(CardName), f"{name} produced unknown card"
