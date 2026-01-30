"""
Quick HTTP API tests - hits backend at localhost:8000.
Run: python test_http_apis.py
"""
import sys
import urllib.request
import urllib.error
import json

BASE = "http://localhost:8000"
PASS = []
FAIL = []


def get(path: str, params: dict = None):
    url = f"{BASE}{path}"
    if params:
        q = "&".join(f"{k}={v}" for k, v in params.items())
        url = f"{url}?{q}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.getcode(), json.loads(r.read().decode()) if r.headers.get("Content-Type", "").startswith("application/json") else None


def test(name: str, path: str, params: dict = None, expect_status: int = 200, expect_key: str = None):
    try:
        status, data = get(path, params)
        if status != expect_status:
            FAIL.append(f"{name}: expected {expect_status}, got {status}")
            print(f"[FAIL] {name}: HTTP {status}")
            return
        if expect_key and (not data or expect_key not in data):
            FAIL.append(f"{name}: missing key '{expect_key}' in response")
            print(f"[FAIL] {name}: missing '{expect_key}'")
            return
        PASS.append(name)
        print(f"[PASS] {name}")
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:200] if e.fp else ""
        FAIL.append(f"{name}: HTTP {e.code} {body}")
        print(f"[FAIL] {name}: HTTP {e.code} {body}")
    except Exception as e:
        FAIL.append(f"{name}: {e}")
        print(f"[FAIL] {name}: {e}")


if __name__ == "__main__":
    print("=" * 60)
    print("HTTP API tests (backend at localhost:8000)")
    print("=" * 60)

    test("GET /api/health", "/api/health", expect_key="status")
    test("GET /api/city/current", "/api/city/current", expect_key="selected")
    test("GET /api/city/list", "/api/city/list", expect_key="cities")
    test("GET /api/data/status", "/api/data/status", expect_key="connected")
    test("GET /api/data/zones", "/api/data/zones", expect_key="zones")
    test("GET /api/data/alerts", "/api/data/alerts", params={"limit": "5"}, expect_key="alerts")
    test("GET /api/models/overview", "/api/models/overview", expect_key="models")
    test("GET /api/live-stream", "/api/live-stream", params={"limit": "10"}, expect_key="ok")
    test("GET /api/analytics/demand/hourly", "/api/analytics/demand/hourly", params={"hours": "24"}, expect_key="data")

    print()
    print("=" * 60)
    print(f"Passed: {len(PASS)}  Failed: {len(FAIL)}")
    if FAIL:
        print("Failed:", FAIL)
    print("=" * 60)
    sys.exit(1 if FAIL else 0)
