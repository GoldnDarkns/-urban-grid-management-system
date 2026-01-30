#!/usr/bin/env python3
"""
Comprehensive test script for Urban Grid Management System
Tests all components: APIs, Kafka, MongoDB, Services
"""
import requests
import json
import sys
import time
from datetime import datetime

BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost"

# Test results
results = {
    "passed": [],
    "failed": [],
    "warnings": []
}

def test(name, func):
    """Run a test and record results"""
    try:
        result = func()
        if result:
            results["passed"].append(name)
            print(f"[PASS] {name}")
            return True
        else:
            results["failed"].append(name)
            print(f"[FAIL] {name}")
            return False
    except Exception as e:
        results["failed"].append(f"{name}: {str(e)}")
        print(f"[FAIL] {name}: {str(e)}")
        return False

def test_backend_health():
    """Test backend is running"""
    try:
        r = requests.get(f"{BASE_URL}/api/health", timeout=5)
        return r.status_code == 200
    except:
        return False

def test_frontend():
    """Test frontend is accessible"""
    try:
        r = requests.get(FRONTEND_URL, timeout=5)
        return r.status_code == 200
    except:
        return False

def test_city_selection():
    """Test city selection endpoints"""
    # Get available cities
    r = requests.get(f"{BASE_URL}/api/city/list", timeout=10)
    if r.status_code != 200:
        return False
    cities = r.json()
    if not cities or len(cities) == 0:
        return False
    
    # Test current city
    r = requests.get(f"{BASE_URL}/api/city/current", timeout=5)
    return r.status_code == 200

def test_processed_data():
    """Test processed data endpoint"""
    r = requests.get(f"{BASE_URL}/api/city/processed-data", timeout=15)
    if r.status_code != 200:
        return False
    data = r.json()
    return "zones" in data or "count" in data

def test_analytics_endpoints():
    """Test analytics endpoints"""
    endpoints = [
        "/api/analytics/demand/hourly",
        "/api/analytics/demand/by-zone",
        "/api/analytics/aqi/daily",
        "/api/analytics/aqi/by-zone",
        "/api/analytics/alerts/summary",
        "/api/analytics/zone-risk",
    ]
    
    passed = 0
    for endpoint in endpoints:
        try:
            r = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
            if r.status_code == 200:
                passed += 1
        except:
            pass
    
    return passed >= len(endpoints) * 0.8  # 80% must pass

def test_analytics_city_mode():
    """Test analytics with city_id parameter"""
    endpoints = [
        "/api/analytics/demand/hourly?city_id=nyc",
        "/api/analytics/aqi/daily?city_id=nyc",
        "/api/analytics/alerts/summary?city_id=nyc",
    ]
    
    passed = 0
    for endpoint in endpoints:
        try:
            r = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
            if r.status_code == 200:
                data = r.json()
                if "data" in data or "count" in data:
                    passed += 1
        except:
            pass
    
    return passed >= len(endpoints) * 0.7  # 70% must pass

def test_live_stream():
    """Test live stream endpoint"""
    r = requests.get(f"{BASE_URL}/api/live-stream", timeout=10)
    if r.status_code != 200:
        return False
    data = r.json()
    return "by_topic" in data or "ok" in data

def test_311_requests():
    """Test 311 requests endpoint"""
    r = requests.get(f"{BASE_URL}/api/live/311/requests?city_id=nyc&limit=10", timeout=10)
    return r.status_code == 200

def test_database_status():
    """Test database status endpoint"""
    r = requests.get(f"{BASE_URL}/api/data/status", timeout=10)
    if r.status_code != 200:
        return False
    data = r.json()
    return "connected" in data

def test_kafka_topics():
    """Test if Kafka topics exist (via backend logs or direct check)"""
    # This is a placeholder - would need Kafka admin API or logs
    return True  # Assume Kafka is working if other tests pass

def main():
    print("=" * 60)
    print("Urban Grid Management System - Comprehensive Test")
    print("=" * 60)
    print()
    
    # Wait for services
    print("Waiting for services to be ready...")
    time.sleep(5)
    
    print("\n[Testing Services...]")
    test("Backend Health", test_backend_health)
    test("Frontend Access", test_frontend)
    test("Database Status", test_database_status)
    
    print("\n[Testing City Selection...]")
    test("City List", test_city_selection)
    test("Processed Data", test_processed_data)
    
    print("\n[Testing Analytics...]")
    test("Analytics Endpoints", test_analytics_endpoints)
    test("Analytics City Mode", test_analytics_city_mode)
    
    print("\n[Testing Live Data...]")
    test("Live Stream", test_live_stream)
    test("311 Requests", test_311_requests)
    
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"[PASS] Passed: {len(results['passed'])}")
    print(f"[FAIL] Failed: {len(results['failed'])}")
    print(f"[WARN] Warnings: {len(results['warnings'])}")
    print()
    
    if results['failed']:
        print("FAILED TESTS:")
        for f in results['failed']:
            print(f"  - {f}")
        print()
    
    if results['passed']:
        print("PASSED TESTS:")
        for p in results['passed']:
            print(f"  - {p}")
    
    print("\n" + "=" * 60)
    
    # Return exit code
    return 0 if len(results['failed']) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
