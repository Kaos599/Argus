"""End-to-end tests for the 11 API endpoints.

Each test uses the in-memory session store + a mock MCP manager
(wired via ``wired_app``) so no real MongoDB is touched.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _deps():
    """Return the live dependency singletons (mutated by the fixture)."""
    from argus.api import dependencies as deps

    return deps


# ---------------------------------------------------------------------------
# POST /api/v1/connect
# ---------------------------------------------------------------------------


class TestConnect:
    def test_returns_session_token(self, client) -> None:
        resp = client.post(
            "/api/v1/connect",
            json={
                "connection_string": "mongodb+srv://u:p@cluster.mongodb.net/db",
                "acknowledged_risks": ["read-only"],
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        # Wire format: snake_case (Zod schema)
        assert "session_token" in body
        assert len(body["session_token"]) == 32  # uuid4 hex
        assert body["status"] == "probing"

    def test_rejects_missing_scheme(self, client) -> None:
        resp = client.post(
            "/api/v1/connect",
            json={"connection_string": "not-a-uri"},
        )
        assert resp.status_code == 400
        body = resp.json()
        assert "error" in body["detail"]
        assert body["detail"]["error"]["code"] == "INVALID_INPUT"

    def test_rejects_empty_connection_string(self, client) -> None:
        resp = client.post("/api/v1/connect", json={"connection_string": ""})
        # Pydantic validation should reject (min_length=1)
        assert resp.status_code in (400, 422)


# ---------------------------------------------------------------------------
# GET /api/v1/probe/{token}
# ---------------------------------------------------------------------------


class TestProbe:
    def test_returns_pending_when_no_subprocess(self, client) -> None:
        # Create a session
        create = client.post(
            "/api/v1/connect",
            json={"connection_string": "mongodb://u:p@host:27017/db"},
        )
        token = create.json()["session_token"]
        resp = client.get(f"/api/v1/probe/{token}")
        assert resp.status_code == 200
        body = resp.json()
        assert body["sample_status"] == "pending"
        assert body["database_name"] == "db"

    def test_returns_404_for_unknown_token(self, client) -> None:
        resp = client.get("/api/v1/probe/" + "deadbeef" * 4)
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/v1/sample/{token}
# ---------------------------------------------------------------------------


class TestSample:
    def test_returns_collection_samples(self, client) -> None:
        create = client.post(
            "/api/v1/connect",
            json={"connection_string": "mongodb://u:p@host:27017/db"},
        )
        token = create.json()["session_token"]

        mcp_ref = _deps()._mcp_manager
        assert mcp_ref is not None
        mcp_ref.subprocesses[token] = True
        mcp_ref.set_result(
            "mongodb_list_collections",
            {"collections": [{"name": "users"}, {"name": "events"}, {"name": "orders"}]},
        )
        # The MCP server returns sample fields using snake_case to match
        # the wire format of the /sample endpoint.
        mcp_ref.set_result(
            "mongodb_collection_schema",
            {
                "fields": ["_id", "user_id", "timestamp", "event_type"],
                "doc_count": 1000,
            },
        )

        resp = client.get(f"/api/v1/sample/{token}")
        assert resp.status_code == 200
        body = resp.json()
        assert "collections" in body
        assert len(body["collections"]) == 3
        names = {c["name"] for c in body["collections"]}
        assert names == {"users", "events", "orders"}
        # Each sample has doc_count (snake_case) and sample_fields (snake_case)
        for coll in body["collections"]:
            assert "doc_count" in coll
            assert "sample_fields" in coll

        session = _deps()._session_store._sessions[token]
        assert session.sampled_schema["collections"] == [
            {
                "name": "users",
                "doc_count": 1000,
                "sample_fields": ["_id", "user_id", "timestamp", "event_type"],
            },
            {
                "name": "events",
                "doc_count": 1000,
                "sample_fields": ["_id", "user_id", "timestamp", "event_type"],
            },
            {
                "name": "orders",
                "doc_count": 1000,
                "sample_fields": ["_id", "user_id", "timestamp", "event_type"],
            },
        ]
        assert session.sampled_schema["users"]["doc_count"] == 1000
        assert session.sampled_schema["users"]["sample_fields"] == [
            "_id",
            "user_id",
            "timestamp",
            "event_type",
        ]


# ---------------------------------------------------------------------------
# POST /api/v1/plan
# ---------------------------------------------------------------------------


class TestPlan:
    def test_returns_plan_steps(self, client) -> None:
        create = client.post(
            "/api/v1/connect",
            json={"connection_string": "mongodb://u:p@host:27017/db"},
        )
        token = create.json()["session_token"]

        planner_ref = _deps()._planner
        planner_ref._plan = [
            {"module": "funnel", "collection": "users", "params": {}},
            {"module": "rfm", "collection": "orders", "params": {}},
        ]

        resp = client.post(
            "/api/v1/plan",
            json={
                "session_token": token,
                "collections": ["users", "orders"],
                "modules": ["funnel", "rfm"],
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "plan_id" in body
        assert len(body["plan"]) == 2
        modules = {step["module"] for step in body["plan"]}
        assert modules == {"funnel", "rfm"}
        # Each step has a pipeline (snake_case).
        for step in body["plan"]:
            assert "mql_pipeline" in step
            assert len(step["mql_pipeline"]) > 0

    def test_plan_uses_sampled_schema_by_collection_name(self, client) -> None:
        create = client.post(
            "/api/v1/connect",
            json={"connection_string": "mongodb://u:p@host:27017/db"},
        )
        token = create.json()["session_token"]

        mcp_ref = _deps()._mcp_manager
        mcp_ref.subprocesses[token] = True
        mcp_ref.set_result(
            "mongodb_list_collections",
            {"collections": [{"name": "users"}]},
        )
        mcp_ref.set_result(
            "mongodb_collection_schema",
            {
                "fields": ["_id", "user_id", "signup_date", "country"],
                "doc_count": 100,
            },
        )

        sample_resp = client.get(f"/api/v1/sample/{token}")
        assert sample_resp.status_code == 200

        planner_ref = _deps()._planner
        planner_ref._plan = [
            {"module": "anomaly", "collection": "generatedpapers", "params": {}},
        ]

        resp = client.post(
            "/api/v1/plan",
            json={
                "session_token": token,
                "collections": ["users"],
                "modules": ["funnel"],
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["plan"]) == 1
        assert body["plan"][0]["module"] == "funnel"

    def test_falls_back_to_deterministic_plan(self, client) -> None:
        create = client.post(
            "/api/v1/connect",
            json={"connection_string": "mongodb://u:p@host:27017/db"},
        )
        token = create.json()["session_token"]

        planner_ref = _deps()._planner
        planner_ref._plan = []  # LLM returns nothing → use fallback

        resp = client.post(
            "/api/v1/plan",
            json={
                "session_token": token,
                "collections": ["users", "orders"],
                "modules": ["funnel", "rfm"],
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["plan"]) == 2

    def test_skips_invalid_planner_steps(self, client) -> None:
        create = client.post(
            "/api/v1/connect",
            json={"connection_string": "mongodb://u:p@host:27017/db"},
        )
        token = create.json()["session_token"]

        planner_ref = _deps()._planner
        planner_ref._plan = [
            {"module": "anomaly", "collection": "generatedpapers", "params": {}},
            {"module": "funnel", "collection": "users", "params": {}},
        ]

        resp = client.post(
            "/api/v1/plan",
            json={
                "session_token": token,
                "collections": ["generatedpapers", "users"],
                "modules": ["anomaly", "funnel"],
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["plan"]) == 1
        assert body["plan"][0]["module"] == "funnel"

    def test_rejects_token_mismatch(self, client) -> None:
        create = client.post(
            "/api/v1/connect",
            json={"connection_string": "mongodb://u:p@host:27017/db"},
        )
        token = create.json()["session_token"]

        resp = client.post(
            "/api/v1/plan",
            json={
                "session_token": "wrong_token_xxxxxxxxxxxxxxxx",
                "collections": ["users"],
                "modules": ["funnel"],
            },
        )
        # Either 400 (path doesn't match body) or 404 (session not found)
        assert resp.status_code in (400, 404)


# ---------------------------------------------------------------------------
# POST /api/v1/render (SSE)
# ---------------------------------------------------------------------------


class TestRender:
    def test_streams_sse_events(self, client) -> None:
        create = client.post(
            "/api/v1/connect",
            json={"connection_string": "mongodb://u:p@host:27017/db"},
        )
        token = create.json()["session_token"]

        planner_ref = _deps()._planner
        planner_ref._plan = [
            {"module": "rfm", "collection": "orders", "params": {}},
        ]
        plan_resp = client.post(
            "/api/v1/plan",
            json={
                "session_token": token,
                "collections": ["orders"],
                "modules": ["rfm"],
            },
        )
        plan_id = plan_resp.json()["plan_id"]

        mcp_ref = _deps()._mcp_manager
        mcp_ref.set_result(
            "mongodb_aggregate",
            {
                "documents": [
                    {"_id": [0, 50], "bucket_range": "0-50", "user_count": 10},
                    {"_id": [50, 200], "bucket_range": "50-200", "user_count": 5},
                ]
            },
        )

        resp = client.post(
            "/api/v1/render",
            json={"session_token": token, "plan_id": plan_id},
        )
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/event-stream")

        body = resp.text
        # We should see SSE events: progress, card, done
        assert "event: progress" in body
        assert "event: card" in body
        assert "event: done" in body
        # The plan_id should appear in the done event
        assert plan_id in body


# ---------------------------------------------------------------------------
# GET /api/v1/dashboard
# ---------------------------------------------------------------------------


class TestDashboard:
    def test_returns_empty_dashboard(self, client) -> None:
        create = client.post(
            "/api/v1/connect",
            json={"connection_string": "mongodb://u:p@host:27017/db"},
        )
        token = create.json()["session_token"]
        resp = client.get(f"/api/v1/dashboard?token={token}")
        assert resp.status_code == 200
        body = resp.json()
        assert "layout" in body
        assert "cards" in body
        assert body["cards"] == []


# ---------------------------------------------------------------------------
# PUT /api/v1/dashboard/layout
# ---------------------------------------------------------------------------


class TestDashboardLayout:
    def test_persists_layout(self, client) -> None:
        create = client.post(
            "/api/v1/connect",
            json={"connection_string": "mongodb://u:p@host:27017/db"},
        )
        token = create.json()["session_token"]
        layout = {
            "lg": [{"i": "card-1", "x": 0, "y": 0, "w": 6, "h": 4}],
            "md": [],
            "sm": [],
            "xs": [],
        }
        resp = client.put(
            "/api/v1/dashboard/layout",
            json={"session_token": token, "layout": layout},
        )
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

        # Read it back
        resp = client.get(f"/api/v1/dashboard?token={token}")
        body = resp.json()
        assert len(body["layout"]["lg"]) == 1
        assert body["layout"]["lg"][0]["i"] == "card-1"


# ---------------------------------------------------------------------------
# POST /api/v1/cards
# ---------------------------------------------------------------------------


class TestAddCard:
    def test_adds_card_to_dashboard(self, client) -> None:
        create = client.post(
            "/api/v1/connect",
            json={"connection_string": "mongodb://u:p@host:27017/db"},
        )
        token = create.json()["session_token"]

        mcp_ref = _deps()._mcp_manager
        mcp_ref.set_result(
            "mongodb_aggregate",
            {"documents": [{"_id": "organic", "user_count": 100}]},
        )

        resp = client.post(
            "/api/v1/cards",
            json={
                "session_token": token,
                "module": "attribution",
                "collection": "events",
                "params": {},
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "card_id" in body
        assert "card" in body
        # The card is a BarChartCard (attribution renders as bar)
        assert body["card"]["componentName"] == "BarChartCard"

        # Verify the card is in the dashboard now.
        resp = client.get(f"/api/v1/dashboard?token={token}")
        body = resp.json()
        assert len(body["cards"]) == 1


# ---------------------------------------------------------------------------
# POST /api/v1/refresh
# ---------------------------------------------------------------------------


class TestRefresh:
    def test_refreshes_cards(self, client) -> None:
        create = client.post(
            "/api/v1/connect",
            json={"connection_string": "mongodb://u:p@host:27017/db"},
        )
        token = create.json()["session_token"]

        mcp_ref = _deps()._mcp_manager
        # Add a card first
        mcp_ref.set_result(
            "mongodb_aggregate",
            {"documents": [{"_id": "organic", "user_count": 100}]},
        )
        client.post(
            "/api/v1/cards",
            json={
                "session_token": token,
                "module": "attribution",
                "collection": "events",
            },
        )

        # Now refresh
        resp = client.post(
            "/api/v1/refresh",
            json={"session_token": token},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "refreshed_count" in body
        assert "error_count" in body


# ---------------------------------------------------------------------------
# GET /api/v1/health
# ---------------------------------------------------------------------------


class TestHealth:
    def test_returns_ok(self, client) -> None:
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        # Zod uses camelCase for ``mcpSubprocesses`` but snake_case for ``uptime_s``.
        assert "uptime_s" in body
        assert "version" in body
        assert "mcpSubprocesses" in body
        assert body["mcpSubprocesses"]["max"] == 10


# ---------------------------------------------------------------------------
# GET /api/v1/events/stream
# ---------------------------------------------------------------------------


class TestEventsStream:
    def test_streams_sse(self, client) -> None:
        create = client.post(
            "/api/v1/connect",
            json={"connection_string": "mongodb://u:p@host:27017/db"},
        )
        token = create.json()["session_token"]
        # The /events/stream endpoint supports ``?max=N`` so tests
        # can bound the read. We set max=1 so the generator closes
        # after the "ready" event.
        resp = client.get(
            f"/api/v1/events/stream?token={token}&max_events=1",
            headers={"Accept": "text/event-stream"},
        )
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/event-stream")
        body = resp.text
        # The ready event should be present.
        assert "event: ready" in body
