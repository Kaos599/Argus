"""Tests for the result-set guard — read-only enforcement."""

from __future__ import annotations

import pytest

from argus.guard.result_set_guard import (
    GuardViolation,
    enforce_limit,
    guard_tool_call,
    redact_connection_string,
    validate_pipeline,
)
from argus.models.api_types import ErrorCode

# ---------------------------------------------------------------------------
# redact_connection_string
# ---------------------------------------------------------------------------


class TestRedactConnectionString:
    def test_redacts_password_in_mongodb_uri(self) -> None:
        s = "mongodb://alice:supersecret@host1:27017/db?retry=true"
        out = redact_connection_string(s)
        assert "supersecret" not in out
        assert "alice" in out  # username is preserved
        assert "***" in out

    def test_redacts_password_in_srv_uri(self) -> None:
        s = "mongodb+srv://bob:hunter2@cluster.mongodb.net/argus"
        out = redact_connection_string(s)
        assert "hunter2" not in out
        assert "bob" in out
        assert "***" in out

    def test_idempotent(self) -> None:
        s = "mongodb://u:p@h/d"
        once = redact_connection_string(s)
        twice = redact_connection_string(once)
        assert once == twice

    def test_no_op_when_no_uri(self) -> None:
        s = "hello world"
        assert redact_connection_string(s) == s

    def test_no_op_when_no_password(self) -> None:
        # ``mongodb://host/db`` — no user/pass
        s = "mongodb://host:27017/db"
        out = redact_connection_string(s)
        assert out == s


# ---------------------------------------------------------------------------
# validate_pipeline — $out and $merge blocking
# ---------------------------------------------------------------------------


class TestValidatePipeline:
    def test_accepts_clean_pipeline(self) -> None:
        pipeline = [
            {"$match": {"x": 1}},
            {"$group": {"_id": "$y", "n": {"$sum": 1}}},
            {"$sort": {"n": -1}},
        ]
        out = validate_pipeline(pipeline)
        assert out == pipeline

    def test_rejects_out_stage(self) -> None:
        pipeline = [
            {"$match": {"x": 1}},
            {"$out": "evil_collection"},
        ]
        with pytest.raises(GuardViolation) as exc:
            validate_pipeline(pipeline)
        assert exc.value.code == ErrorCode.READ_ONLY_VIOLATION
        assert "$out" in exc.value.message

    def test_rejects_merge_stage(self) -> None:
        pipeline = [
            {"$merge": {"into": "evil"}},
        ]
        with pytest.raises(GuardViolation) as exc:
            validate_pipeline(pipeline)
        assert exc.value.code == ErrorCode.READ_ONLY_VIOLATION
        assert "$merge" in exc.value.message

    def test_rejects_out_inside_facet(self) -> None:
        # $out hidden inside a $facet should still be caught.
        pipeline = [
            {
                "$facet": {
                    "leaky": [{"$out": "x"}],
                }
            }
        ]
        with pytest.raises(GuardViolation) as exc:
            validate_pipeline(pipeline)
        assert exc.value.code == ErrorCode.READ_ONLY_VIOLATION

    def test_rejects_malformed_stage(self) -> None:
        with pytest.raises(GuardViolation) as exc:
            validate_pipeline([{"not_a_stage": 1}])
        assert exc.value.code == ErrorCode.INVALID_INPUT

    def test_rejects_too_many_stages(self) -> None:
        pipeline = [{"$match": {"i": i}} for i in range(100)]
        with pytest.raises(GuardViolation) as exc:
            validate_pipeline(pipeline, max_stages=10)
        assert exc.value.code == ErrorCode.INVALID_INPUT

    def test_rejects_non_iterable(self) -> None:
        with pytest.raises(GuardViolation) as exc:
            validate_pipeline(42)  # type: ignore[arg-type]
        assert exc.value.code == ErrorCode.INVALID_INPUT


# ---------------------------------------------------------------------------
# enforce_limit — .limit() enforcement
# ---------------------------------------------------------------------------


class TestEnforceLimit:
    def test_adds_limit_to_find_without_one(self) -> None:
        args = {"operation": "find", "filter": {"x": 1}}
        out = enforce_limit(args, max_documents=500)
        assert out["limit"] == 500

    def test_keeps_smaller_existing_limit(self) -> None:
        args = {"operation": "find", "filter": {}, "limit": 100}
        out = enforce_limit(args, max_documents=500)
        assert out["limit"] == 100

    def test_overrides_oversized_limit(self) -> None:
        args = {"operation": "find", "filter": {}, "limit": 10_000}
        out = enforce_limit(args, max_documents=500)
        assert out["limit"] == 500

    def test_adds_limit_to_aggregate(self) -> None:
        args = {"operation": "aggregate", "pipeline": [{"$match": {"x": 1}}]}
        out = enforce_limit(args, max_documents=200)
        assert out["pipeline"][-1] == {"$limit": 200}

    def test_aggregate_with_existing_limit_below_cap(self) -> None:
        args = {
            "operation": "aggregate",
            "pipeline": [{"$match": {}}, {"$limit": 50}],
        }
        out = enforce_limit(args, max_documents=500)
        assert out["pipeline"][-1] == {"$limit": 50}

    def test_aggregate_with_existing_limit_above_cap(self) -> None:
        args = {
            "operation": "aggregate",
            "pipeline": [{"$match": {}}, {"$limit": 9999}],
        }
        out = enforce_limit(args, max_documents=500)
        assert out["pipeline"][-1] == {"$limit": 500}

    def test_rejects_unknown_operation(self) -> None:
        with pytest.raises(GuardViolation):
            enforce_limit({"operation": "drop_database"}, max_documents=100)

    def test_rejects_non_dict_args(self) -> None:
        with pytest.raises(GuardViolation):
            enforce_limit("not a dict", max_documents=100)  # type: ignore[arg-type]

    def test_rejects_zero_max(self) -> None:
        with pytest.raises(GuardViolation):
            enforce_limit({"operation": "find", "filter": {}}, max_documents=0)

    def test_infers_find_from_filter_key(self) -> None:
        args = {"filter": {"x": 1}}
        out = enforce_limit(args, max_documents=42)
        assert out["limit"] == 42

    def test_infers_aggregate_from_pipeline_key(self) -> None:
        args = {"pipeline": [{"$match": {}}]}
        out = enforce_limit(args, max_documents=42)
        assert out["pipeline"][-1] == {"$limit": 42}


# ---------------------------------------------------------------------------
# guard_tool_call — top-level entry point
# ---------------------------------------------------------------------------


class TestGuardToolCall:
    def test_combines_pipeline_validation_and_limit(self) -> None:
        args = {
            "operation": "aggregate",
            "pipeline": [{"$match": {"x": 1}}, {"$out": "evil"}],
        }
        with pytest.raises(GuardViolation) as exc:
            guard_tool_call("mongodb_aggregate", args, max_documents=100)
        assert exc.value.code == ErrorCode.READ_ONLY_VIOLATION

    def test_passes_through_clean_aggregate(self) -> None:
        args = {
            "operation": "aggregate",
            "pipeline": [{"$match": {"x": 1}}, {"$group": {"_id": "$x"}}],
        }
        out = guard_tool_call("mongodb_aggregate", args, max_documents=100)
        assert out["pipeline"][-1] == {"$limit": 100}
