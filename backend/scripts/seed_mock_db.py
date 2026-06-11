"""Seed mock MongoDB collections with realistic demo data.

Usage:
  python scripts/seed_mock_db.py

Requires ARGUS_CONNECTION_STRING env var pointing to the target MongoDB.
Connects, drops existing data in argus_mock_db, and inserts fresh records.
"""

import os
import random
import uuid
from datetime import datetime, timedelta

import pymongo

CONNECTION_STRING = os.environ.get("ARGUS_CONNECTION_STRING")
if not CONNECTION_STRING:
    raise RuntimeError(
        "Set ARGUS_CONNECTION_STRING to a real MongoDB connection string, e.g.\n"
        '  $env:ARGUS_CONNECTION_STRING="mongodb+srv://user:pass@cluster.mongodb.net/"'
    )

client = pymongo.MongoClient(CONNECTION_STRING)
db = client["argus_mock_db"]

db.users.drop()
db.orders.drop()
db.logs.drop()
db.events.drop()

countries = ["US", "IN", "GB", "DE", "BR", "FR", "JP", "CA", "AU"]
channels = ["organic", "paid_search", "social", "email", "referral"]

print("Generating users...")
users = []
names = [
    "Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace",
    "Heidi", "Ivan", "Judy", "Mallory", "Victor", "Peggy", "Trent",
]
now = datetime.utcnow()

for i in range(100):
    signup_dt = now - timedelta(days=random.randint(0, 120))
    activated = random.random() < 0.6
    has_purchased = activated and random.random() < 0.8
    first_purchase_at = (
        signup_dt + timedelta(days=random.randint(1, 10))
        if has_purchased
        else None
    )
    first_purchase_amount = (
        round(random.uniform(20.0, 500.0), 2) if has_purchased else None
    )

    user = {
        "_id": str(uuid.uuid4()),
        "name": random.choice(names) + f" {random.randint(100, 999)}",
        "email": f"user_{i}_{random.randint(1000, 9999)}@example.com",
        "age": random.randint(18, 75),
        "signup_date": signup_dt,
        "status": random.choices(
            ["active", "inactive", "pending"], weights=[70, 20, 10]
        )[0],
        "plan": random.choices(
            ["free", "premium", "enterprise"], weights=[60, 30, 10]
        )[0],
        "country": random.choice(countries),
        "activated": activated,
    }
    if first_purchase_at:
        user["first_purchase_at"] = first_purchase_at
        user["first_purchase_amount"] = first_purchase_amount
    users.append(user)

db.users.insert_many(users)

print("Generating orders...")
orders = []
for i in range(500):
    user = random.choice(users)
    order_items = [
        {
            "product_id": f"PROD-{random.randint(1000, 9999)}",
            "name": f"Product {random.randint(1, 100)}",
            "quantity": random.randint(1, 5),
            "unit_price": round(random.uniform(5.0, 250.0), 2),
        }
        for _ in range(random.randint(1, 5))
    ]
    amount = sum(item["quantity"] * item["unit_price"] for item in order_items)
    orders.append(
        {
            "_id": str(uuid.uuid4()),
            "user_id": user["_id"],
            "amount": round(amount, 2),
            "currency": "USD",
            "items": order_items,
            "status": random.choices(
                ["processing", "shipped", "delivered", "cancelled", "returned"],
                weights=[10, 20, 60, 5, 5],
            )[0],
            "payment_method": random.choice(
                ["credit_card", "paypal", "crypto", "bank_transfer"]
            ),
            "created_at": now - timedelta(days=random.randint(0, 120)),
        }
    )

db.orders.insert_many(orders)

print("Generating events...")
events = []
event_types = ["landing", "signup", "app_open", "session_start", "purchase"]
for user in users:
    events.append(
        {
            "_id": str(uuid.uuid4()),
            "user_id": user["_id"],
            "event_type": random.choice(["landing", "signup"]),
            "timestamp": user["signup_date"]
            - timedelta(minutes=random.randint(1, 60)),
            "channel": random.choice(channels),
        }
    )
    for _ in range(random.randint(5, 50)):
        events.append(
            {
                "_id": str(uuid.uuid4()),
                "user_id": user["_id"],
                "event_type": random.choice(event_types),
                "timestamp": user["signup_date"]
                + timedelta(days=random.randint(0, 90)),
                "channel": random.choice(channels),
            }
        )

db.events.insert_many(events)

print("Generating logs...")
logs = []
endpoints = [
    "/api/v1/login",
    "/api/v1/checkout",
    "/api/v1/products",
    "/api/v1/users",
    "/health",
    "/api/v1/cart",
]
methods = ["GET", "POST", "PUT", "DELETE", "PATCH"]
for i in range(2000):
    is_error = random.random() < 0.05
    status_code = (
        random.choice([500, 502, 503, 404, 401, 403])
        if is_error
        else random.choices([200, 201, 204], weights=[80, 15, 5])[0]
    )
    level = (
        "ERROR"
        if status_code >= 400
        else random.choices(["INFO", "WARNING", "DEBUG"], weights=[70, 10, 20])[0]
    )
    logs.append(
        {
            "_id": str(uuid.uuid4()),
            "timestamp": now - timedelta(hours=random.randint(0, 24 * 30)),
            "level": level,
            "method": random.choice(methods),
            "endpoint": random.choice(endpoints),
            "status_code": status_code,
            "response_time_ms": random.randint(10, 3000)
            if is_error
            else random.randint(10, 300),
            "ip_address": f"192.168.{random.randint(1, 255)}.{random.randint(1, 255)}",
            "user_agent": random.choice(
                [
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)",
                    "curl/7.68.0",
                ]
            ),
        }
    )

db.logs.insert_many(logs)

print("Mock data generated successfully!")
print(f"Users: {len(users)}")
print(f"Orders: {len(orders)}")
print(f"Events: {len(events)}")
print(f"Logs: {len(logs)}")
