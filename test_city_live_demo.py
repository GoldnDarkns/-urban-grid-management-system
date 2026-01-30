"""
Demo test script for City Live tabs
Tests all pages after processing a city
"""
import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8000/api"

def print_section(title):
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)

def test_endpoint(method, endpoint, data=None, params=None):
    """Test an API endpoint and return result"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == "GET":
            r = requests.get(url, params=params, timeout=10)
        elif method == "POST":
            r = requests.post(url, json=data, params=params, timeout=30)
        else:
            return None, f"Unknown method: {method}"
        
        return r.status_code, r.json() if r.headers.get('content-type', '').startswith('application/json') else r.text
    except Exception as e:
        return None, str(e)

# Test 1: Select a city (San Francisco)
print_section("STEP 1: SELECTING CITY (San Francisco)")
status, response = test_endpoint("POST", "/city/select/sf")
print(f"Status: {status}")
print(f"Response: {json.dumps(response, indent=2)[:500]}")

# Test 2: Check current city
print_section("STEP 2: CHECKING CURRENT CITY")
status, response = test_endpoint("GET", "/city/current")
print(f"Status: {status}")
print(f"Current City: {json.dumps(response, indent=2)}")

# Test 3: Process all zones
print_section("STEP 3: PROCESSING ALL ZONES")
print("This may take 1-2 minutes...")
status, response = test_endpoint("POST", "/city/process/all", params={"city_id": "sf"})
print(f"Status: {status}")
if isinstance(response, dict):
    summary = response.get("summary", {})
    print(f"Processing Summary:")
    print(f"  Total Zones: {summary.get('total_zones', 'N/A')}")
    print(f"  Successful: {summary.get('successful', 'N/A')}")
    print(f"  Failed: {summary.get('failed', 'N/A')}")
    print(f"  DB Status: {response.get('db_status', 'N/A')}")
else:
    print(f"Response: {str(response)[:500]}")

time.sleep(2)  # Wait a bit

# Test 4: Get processed data
print_section("STEP 4: CHECKING PROCESSED DATA (Zones Tab)")
status, response = test_endpoint("GET", "/city/processed-data", params={"city_id": "sf", "limit": 100})
print(f"Status: {status}")
if isinstance(response, dict):
    zones = response.get("zones", [])
    print(f"Total Zones Returned: {len(zones)}")
    print(f"Total Unique Zones: {response.get('total_unique_zones', len(zones))}")
    if zones:
        sample = zones[0]
        print(f"\nSample Zone Data:")
        print(f"  Zone ID: {sample.get('zone_id')}")
        print(f"  Has raw_data: {bool(sample.get('raw_data'))}")
        print(f"  Has ml_processed: {bool(sample.get('ml_processed'))}")
        raw_data = sample.get("raw_data", {})
        ml_data = sample.get("ml_processed", {})
        print(f"  AQI in raw_data: {raw_data.get('aqi', {}).get('aqi') if isinstance(raw_data.get('aqi'), dict) else 'N/A'}")
        print(f"  Demand forecast: {ml_data.get('demand_forecast', {}).get('next_hour_kwh') if isinstance(ml_data.get('demand_forecast'), dict) else 'N/A'}")
        print(f"  Risk score: {ml_data.get('risk_score', {}).get('score') if isinstance(ml_data.get('risk_score'), dict) else 'N/A'}")
        print(f"  Grid priority: {raw_data.get('grid_priority', 'N/A')}")

# Test 5: Get alerts
print_section("STEP 5: CHECKING ALERTS")
status, response = test_endpoint("GET", "/data/alerts", params={"limit": 20, "city_id": "sf"})
print(f"Status: {status}")
if isinstance(response, dict):
    alerts = response.get("alerts", [])
    print(f"Total Alerts: {len(alerts)}")
    if alerts:
        print(f"\nSample Alert:")
        print(f"  Zone: {alerts[0].get('zone_id')}")
        print(f"  Level: {alerts[0].get('level')}")
        print(f"  Type: {alerts[0].get('type')}")
        print(f"  Message: {alerts[0].get('message', '')[:100]}")
    else:
        print("  ⚠️  NO ALERTS FOUND")

# Test 6: Get database status
print_section("STEP 6: CHECKING DATABASE STATUS")
status, response = test_endpoint("GET", "/data/status", params={"city_id": "sf"})
print(f"Status: {status}")
if isinstance(response, dict):
    collections = response.get("collections", {})
    print(f"Connected: {response.get('connected')}")
    print(f"Database: {response.get('database')}")
    print(f"\nCollection Counts:")
    for coll_name, coll_data in collections.items():
        if isinstance(coll_data, dict):
            count = coll_data.get("count", 0)
            distinct = coll_data.get("distinct_zones")
            if distinct is not None:
                print(f"  {coll_name}: {count} docs, {distinct} distinct zones")
            else:
                print(f"  {coll_name}: {count} docs")

# Test 7: Get analytics data
print_section("STEP 7: CHECKING ANALYTICS DATA")
status, response = test_endpoint("GET", "/analytics/demand/hourly", params={"city_id": "sf", "hours": 24})
print(f"Status: {status}")
if isinstance(response, dict):
    hourly = response.get("hourly_demand", [])
    print(f"Hourly Demand Records: {len(hourly)}")
    if hourly:
        print(f"  Sample: {hourly[0]}")
    else:
        print("  ⚠️  NO HOURLY DATA")

# Test 8: Get costs
print_section("STEP 8: CHECKING COST ANALYSIS")
status, response = test_endpoint("GET", "/city/costs", params={"city_id": "sf"})
print(f"Status: {status}")
if isinstance(response, dict):
    if "error" in response:
        print(f"  ❌ ERROR: {response.get('error')}")
    else:
        print(f"  Energy Cost: ${response.get('energy_usd', 0):.2f}")
        print(f"  CO2 Cost: ${response.get('co2_usd', 0):.2f}")
        print(f"  AQI Cost: ${response.get('aqi_usd', 0):.2f}")
        print(f"  Total Cost: ${response.get('total_usd', 0):.2f}")
        print(f"  Total kWh: {response.get('total_kwh', 0):.2f}")
else:
    print(f"  Response: {str(response)[:200]}")

# Test 9: Get zone coordinates
print_section("STEP 9: CHECKING ZONE COORDINATES")
status, response = test_endpoint("GET", "/city/zones/coordinates", params={"city_id": "sf"})
print(f"Status: {status}")
if isinstance(response, dict):
    zones = response.get("zones", [])
    print(f"Total Zones with Coordinates: {len(zones)}")
    if zones:
        print(f"  Sample: {zones[0].get('zone_id')} - {zones[0].get('name', 'No name')}")

# Test 10: Get live stream
print_section("STEP 10: CHECKING LIVE STREAM")
status, response = test_endpoint("GET", "/live-stream", params={"limit": 5})
print(f"Status: {status}")
if isinstance(response, dict):
    messages = response.get("messages", [])
    print(f"Live Stream Messages: {len(messages)}")
    if messages:
        print(f"  Sample: {messages[0].get('type')} - {messages[0].get('data', {}).get('zone_id', 'N/A')}")

print_section("DEMO TEST COMPLETE")
print("\nSummary of Issues Found:")
print("="*80)
