"""Manual test: hit a specific sample endpoint.

Usage:
  python -m tests.manual.test_endpoint <session_token>

If no token given, tries the one from ARGUS_SESSION_TOKEN env var.
"""

import httpx
import os
import sys

token = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("ARGUS_SESSION_TOKEN")
if not token:
    print("Usage: python -m tests.manual.test_endpoint <session_token>")
    print("Or set ARGUS_SESSION_TOKEN env var.")
    sys.exit(1)

r = httpx.get(
    f"http://localhost:8080/api/v1/sample/{token}",
    timeout=30.0,
)
print(r.status_code)
print(r.text)
