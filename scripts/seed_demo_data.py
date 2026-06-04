"""Seed a MongoDB cluster with the demo data Argus needs to demo.

Three collections: ``users`` (1k), ``events`` (50k), ``orders`` (5k).
Shapes are designed to exercise all 5 insight modules:

- Funnel: signups -> activation events -> revenue
- Cohort: users.createdAt + events.userId for retention
- RFM: orders.userId, orders.amount, orders.createdAt
- Attribution: events.properties.source
- Anomaly: events.timestamp + daily counts

Usage::

    export ARGUS_DEMO_CONNECTION_STRING=mongodb://localhost:27017/argus_demo
    python scripts/seed_demo_data.py

Or via docker compose::

    docker compose up seed
"""

from __future__ import annotations

import argparse
import os
import random
import sys
import time
from datetime import datetime, timedelta, timezone
from typing import Any

try:
    from pymongo import ASCENDING, MongoClient
    from pymongo.errors import BulkWriteError, ConnectionFailure
except ImportError as exc:
    print(
        "pymongo is required. Install with: pip install pymongo>=4.6.0",
        file=sys.stderr,
    )
    raise SystemExit(1) from exc

try:
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
    from argus.guard.result_set_guard import redact_connection_string
except ImportError:
    def redact_connection_string(text: str) -> str:  # type: ignore[misc]
        """Fallback redaction: drop userinfo from any mongodb URI in ``text``."""
        import re

        return re.sub(
            r"(mongodb(?:\+srv)?://)([^@\s]+)@",
            r"\1***@",
            text,
        )


COUNTRIES = ["US", "IN", "GB", "DE", "BR", "JP", "CA", "AU", "FR", "SG"]
PLANS = ["free", "pro", "team", "enterprise"]
SOURCES = ["organic", "paid_search", "social", "referral", "email", "direct"]
EVENT_TYPES = ["page_view", "signup", "activation", "purchase", "logout"]
PRODUCT_IDS = [f"prod_{i:03d}" for i in range(1, 51)]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--connection-string",
        default=os.environ.get("ARGUS_DEMO_CONNECTION_STRING"),
        help="MongoDB connection string (default: $ARGUS_DEMO_CONNECTION_STRING)",
    )
    p.add_argument("--users", type=int, default=int(os.environ.get("ARGUS_DEMO_USERS", "1000")))
    p.add_argument("--events", type=int, default=int(os.environ.get("ARGUS_DEMO_EVENTS", "50000")))
    p.add_argument("--orders", type=int, default=int(os.environ.get("ARGUS_DEMO_ORDERS", "5000")))
    p.add_argument("--drop", action="store_true", help="Drop existing collections first")
    p.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    return p.parse_args()


def gen_user(i: int, start: datetime, rng: random.Random) -> dict[str, Any]:
    """Generate a single user document."""
    created_at = start + timedelta(seconds=rng.randint(0, int((datetime.now(timezone.utc) - start).total_seconds())))
    return {
        "_id": f"user_{i:06d}",
        "email": f"user{i:06d}@example.com",
        "name": f"User {i:06d}",
        "createdAt": created_at,
        "plan": rng.choices(PLANS, weights=[70, 20, 8, 2])[0],
        "country": rng.choice(COUNTRIES),
        "acquisition_source": rng.choice(SOURCES),
    }


def gen_event(user: dict[str, Any], t: datetime, rng: random.Random) -> dict[str, Any]:
    """Generate a single event document."""
    return {
        "userId": user["_id"],
        "event": rng.choice(EVENT_TYPES),
        "timestamp": t,
        "properties": {
            "source": rng.choice(SOURCES),
            "country": user["country"],
            "session_id": f"ses_{rng.randint(10**9, 10**10 - 1)}",
        },
    }


def gen_order(user: dict[str, Any], t: datetime, rng: random.Random) -> dict[str, Any]:
    """Generate a single order document."""
    return {
        "_id": f"ord_{rng.randint(10**9, 10**10 - 1)}",
        "userId": user["_id"],
        "amount": round(rng.lognormvariate(4.0, 0.8), 2),
        "productId": rng.choice(PRODUCT_IDS),
        "createdAt": t,
    }


def bulk_insert(collection: Any, docs: list[dict[str, Any]], batch_size: int = 1000) -> int:
    """Insert in batches; return count actually inserted."""
    inserted = 0
    for i in range(0, len(docs), batch_size):
        batch = docs[i : i + batch_size]
        try:
            result = collection.insert_many(batch, ordered=False)
            inserted += len(result.inserted_ids)
        except BulkWriteError as exc:
            inserted += exc.details.get("nInserted", 0)
    return inserted


def main() -> int:
    args = parse_args()
    if not args.connection_string:
        print(
            "ERROR: no connection string. Set ARGUS_DEMO_CONNECTION_STRING or pass --connection-string",
            file=sys.stderr,
        )
        return 2

    rng = random.Random(args.seed)
    start = datetime.now(timezone.utc) - timedelta(days=180)
    print(f"connecting to {redact_connection_string(args.connection_string)}...")

    try:
        client: MongoClient = MongoClient(args.connection_string, serverSelectionTimeoutMS=10000)
        client.admin.command("ping")
    except ConnectionFailure as exc:
        print(f"ERROR: could not connect: {exc}", file=sys.stderr)
        return 1

    db = client.get_database()
    print(f"using database: {db.name}")

    if args.drop:
        for name in ("users", "events", "orders"):
            db.drop_collection(name)
            print(f"  dropped {name}")

    t0 = time.time()
    print(f"generating {args.users} users...")
    users = [gen_user(i, start, rng) for i in range(args.users)]

    print(f"generating {args.events} events...")
    events: list[dict[str, Any]] = []
    for _ in range(args.events):
        user = rng.choice(users)
        t = user["createdAt"] + timedelta(
            days=rng.randint(0, 180),
            hours=rng.randint(0, 23),
            minutes=rng.randint(0, 59),
        )
        events.append(gen_event(user, t, rng))

    print(f"generating {args.orders} orders...")
    orders: list[dict[str, Any]] = []
    for _ in range(args.orders):
        user = rng.choice(users)
        t = user["createdAt"] + timedelta(
            days=rng.randint(0, 180),
            hours=rng.randint(0, 23),
            minutes=rng.randint(0, 59),
        )
        orders.append(gen_order(user, t, rng))

    gen_elapsed = time.time() - t0
    print(f"  generated in {gen_elapsed:.2f}s")

    t1 = time.time()
    print("inserting users...")
    n_users = bulk_insert(db["users"], users)
    print(f"  inserted {n_users} users in {time.time() - t1:.2f}s")

    t2 = time.time()
    print("inserting events...")
    n_events = bulk_insert(db["events"], events)
    print(f"  inserted {n_events} events in {time.time() - t2:.2f}s")

    t3 = time.time()
    print("inserting orders...")
    n_orders = bulk_insert(db["orders"], orders)
    print(f"  inserted {n_orders} orders in {time.time() - t3:.2f}s")

    print("creating indexes...")
    db["users"].create_index([("createdAt", ASCENDING)])
    db["users"].create_index([("country", ASCENDING)])
    db["events"].create_index([("userId", ASCENDING), ("timestamp", ASCENDING)])
    db["events"].create_index([("event", ASCENDING), ("timestamp", ASCENDING)])
    db["events"].create_index([("timestamp", ASCENDING)])
    db["orders"].create_index([("userId", ASCENDING), ("createdAt", ASCENDING)])
    db["orders"].create_index([("createdAt", ASCENDING)])

    total = time.time() - t0
    print()
    print("=" * 60)
    print("seed complete")
    print(f"  users : {n_users}")
    print(f"  events: {n_events}")
    print(f"  orders: {n_orders}")
    print(f"  total : {total:.2f}s")
    print()
    print("now point Argus at this cluster:")
    print(f"  {redact_connection_string(args.connection_string)}")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
