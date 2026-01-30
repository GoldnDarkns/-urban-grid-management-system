"""
Comprehensive API Test Script
Tests all live APIs and backend endpoints to identify what's working and what's not.
"""
import sys
import os
import asyncio
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Test results storage
results = {
    "passed": [],
    "failed": [],
    "warnings": []
}

def test_result(name: str, passed: bool, message: str = "", warning: bool = False):
    """Record a test result."""
    if warning:
        results["warnings"].append({"name": name, "message": message})
        print(f"[WARN] {name}: {message}")
    elif passed:
        results["passed"].append({"name": name, "message": message})
        print(f"[PASS] {name}: {message}")
    else:
        results["failed"].append({"name": name, "message": message})
        print(f"[FAIL] {name}: {message}")

print("=" * 80)
print("COMPREHENSIVE API TEST SUITE")
print("=" * 80)
print()

# ==================== 1. Test Imports ====================
print("1. Testing Imports...")
print("-" * 80)

try:
    from backend.services.weather_service import WeatherService
    test_result("Import WeatherService", True)
except Exception as e:
    test_result("Import WeatherService", False, str(e))

try:
    from backend.services.aqi_service import AQIService
    test_result("Import AQIService", True)
except Exception as e:
    test_result("Import AQIService", False, str(e))

try:
    from backend.services.traffic_service import TrafficService
    test_result("Import TrafficService", True)
except Exception as e:
    test_result("Import TrafficService", False, str(e))

try:
    from backend.services.eia_service import EIAService
    test_result("Import EIAService", True)
except Exception as e:
    test_result("Import EIAService", False, str(e))

try:
    from backend.services.population_service import PopulationService
    test_result("Import PopulationService", True)
except Exception as e:
    test_result("Import PopulationService", False, str(e))

try:
    from backend.services.infrastructure_service import InfrastructureService
    test_result("Import InfrastructureService", True)
except Exception as e:
    test_result("Import InfrastructureService", False, str(e))

try:
    from backend.services.city311_service import City311Service
    test_result("Import City311Service", True)
except Exception as e:
    test_result("Import City311Service", False, str(e))

try:
    from backend.services.city_config import CityService
    test_result("Import CityService", True)
except Exception as e:
    test_result("Import CityService", False, str(e))

try:
    from backend.services.data_processor import DataProcessor
    test_result("Import DataProcessor", True)
except Exception as e:
    test_result("Import DataProcessor", False, str(e))

try:
    from backend.services.background_processor import get_background_processor
    test_result("Import BackgroundProcessor", True)
except Exception as e:
    test_result("Import BackgroundProcessor", False, str(e))

try:
    from backend.routes.city_selection import router, select_city
    test_result("Import city_selection router", True)
except Exception as e:
    test_result("Import city_selection router", False, str(e))

try:
    from src.db.mongo_client import get_db, ping
    test_result("Import MongoDB client", True)
except Exception as e:
    test_result("Import MongoDB client", False, str(e))

print()

# ==================== 2. Test MongoDB Connection ====================
print("2. Testing MongoDB Connection...")
print("-" * 80)

try:
    db_connected = ping()
    if db_connected:
        db = get_db()
        if db is not None:
            test_result("MongoDB Connection", True, "Connected successfully")
        else:
            test_result("MongoDB Connection", False, "get_db() returned None")
    else:
        test_result("MongoDB Connection", False, "ping() returned False")
except Exception as e:
    test_result("MongoDB Connection", False, f"Exception: {str(e)}")

print()

# ==================== 3. Test City Service ====================
print("3. Testing City Service...")
print("-" * 80)

try:
    cities = CityService.list_cities()
    if cities and len(cities) > 0:
        test_result("CityService.list_cities()", True, f"Found {len(cities)} cities")
        for city in cities[:3]:  # Show first 3
            print(f"   - {city.get('name', 'Unknown')} ({city.get('id', 'N/A')})")
    else:
        test_result("CityService.list_cities()", False, "No cities returned")
except Exception as e:
    test_result("CityService.list_cities()", False, str(e))

try:
    city = CityService.get_city("nyc")
    if city:
        test_result("CityService.get_city('nyc')", True, f"Found: {city.name}")
    else:
        test_result("CityService.get_city('nyc')", False, "City not found")
except Exception as e:
    test_result("CityService.get_city('nyc')", False, str(e))

try:
    zones = CityService.calculate_zone_coordinates("nyc", num_zones=20)
    if zones and len(zones) == 20:
        test_result("CityService.calculate_zone_coordinates()", True, f"Generated {len(zones)} zones")
    else:
        test_result("CityService.calculate_zone_coordinates()", False, f"Expected 20 zones, got {len(zones) if zones else 0}")
except Exception as e:
    test_result("CityService.calculate_zone_coordinates()", False, str(e))

print()

# ==================== 4. Test Live API Services ====================
print("4. Testing Live API Services...")
print("-" * 80)

# Test Weather API
try:
    weather_service = WeatherService()
    weather = weather_service.get_current_weather(40.7128, -74.0060)  # NYC coordinates
    if weather and weather.get("temp") is not None:
        test_result("Weather API (OpenWeatherMap)", True, f"Temp: {weather.get('temp')}°C")
    else:
        test_result("Weather API (OpenWeatherMap)", False, "No data returned or missing temp")
except Exception as e:
    test_result("Weather API (OpenWeatherMap)", False, str(e))

# Test AQI API
try:
    aqi_service = AQIService()
    aqi = aqi_service.get_current_aqi(40.7128, -74.0060)  # NYC coordinates
    if aqi and aqi.get("aqi") is not None:
        test_result("AQI API (AirVisual/OpenAQ)", True, f"AQI: {aqi.get('aqi')}")
    else:
        test_result("AQI API (AirVisual/OpenAQ)", False, "No data returned or missing AQI")
except Exception as e:
    test_result("AQI API (AirVisual/OpenAQ)", False, str(e))

# Test Traffic API
try:
    traffic_service = TrafficService()
    traffic = traffic_service.get_traffic_flow(40.7128, -74.0060)  # NYC coordinates
    if traffic:
        test_result("Traffic API (TomTom)", True, f"Flow: {traffic.get('flow', 'N/A')}")
    else:
        test_result("Traffic API (TomTom)", False, "No data returned")
except Exception as e:
    test_result("Traffic API (TomTom)", False, str(e))

# Test EIA API
try:
    eia_service = EIAService()
    electricity = eia_service.get_electricity_operational_data(state="NY", frequency="monthly", limit=1)
    if electricity:
        test_result("EIA API (Electricity)", True, "Data retrieved")
    else:
        test_result("EIA API (Electricity)", False, "No data returned")
except Exception as e:
    test_result("EIA API (Electricity)", False, str(e))

# Test Population API
try:
    pop_service = PopulationService()
    population = pop_service.get_population_by_zipcode("10001")  # NYC ZIP
    if population:
        test_result("Population API (Census)", True, f"Population: {population.get('population', 'N/A')}")
    else:
        test_result("Population API (Census)", False, "No data returned")
except Exception as e:
    test_result("Population API (Census)", False, str(e))

# Test Infrastructure API (OpenStreetMap - no key needed)
try:
    infra_service = InfrastructureService()
    buildings = infra_service.get_buildings_in_area("40.7,-74.0,40.8,-73.9")  # NYC bbox
    if buildings:
        test_result("Infrastructure API (OpenStreetMap)", True, f"Found {len(buildings)} buildings")
    else:
        test_result("Infrastructure API (OpenStreetMap)", False, "No data returned")
except Exception as e:
    test_result("Infrastructure API (OpenStreetMap)", False, str(e))

# Test 311 API
try:
    city311_service = City311Service(city="nyc")
    requests = city311_service.get_311_requests("nyc", limit=1)
    if requests is not None:
        test_result("311 API (City 311)", True, f"Retrieved {len(requests) if isinstance(requests, list) else 'data'}")
    else:
        test_result("311 API (City 311)", False, "No data returned")
except Exception as e:
    test_result("311 API (City 311)", False, str(e))

print()

# ==================== 5. Test DataProcessor ====================
print("5. Testing DataProcessor...")
print("-" * 80)

try:
    processor = DataProcessor(city_id="nyc")
    if processor and processor.city_config:
        test_result("DataProcessor.__init__()", True, f"Initialized for {processor.city_config.name}")
    else:
        test_result("DataProcessor.__init__()", False, "Missing city_config")
except Exception as e:
    test_result("DataProcessor.__init__()", False, str(e))

# Test process_zone_data (async)
try:
    async def test_process_zone():
        processor = DataProcessor(city_id="nyc")
        result = await processor.process_zone_data("Z_001", 40.7128, -74.0060)
        if result and "raw_data" in result:
            return True, "Zone processed successfully"
        return False, "Missing raw_data in result"
    
    result = asyncio.run(test_process_zone())
    if isinstance(result, tuple):
        test_result("DataProcessor.process_zone_data()", result[0], result[1])
    else:
        test_result("DataProcessor.process_zone_data()", True, "Processed")
except Exception as e:
    test_result("DataProcessor.process_zone_data()", False, str(e))

print()

# ==================== 6. Test Background Processor ====================
print("6. Testing Background Processor...")
print("-" * 80)

try:
    processor = get_background_processor(city_id="nyc", interval_seconds=300)
    if processor:
        test_result("get_background_processor()", True, "Processor retrieved")
    else:
        test_result("get_background_processor()", False, "None returned")
except Exception as e:
    test_result("get_background_processor()", False, str(e))

try:
    processor = get_background_processor(city_id="nyc")
    processor.update_city("chicago")
    test_result("BackgroundProcessor.update_city()", True, "City updated")
except Exception as e:
    test_result("BackgroundProcessor.update_city()", False, str(e))

print()

# ==================== 7. Test City Selection Route (Direct Function Call) ====================
print("7. Testing City Selection Route (Direct Function Call)...")
print("-" * 80)

async def test_select_city():
    """Test the select_city function directly."""
    try:
        from backend.routes.city_selection import select_city
        result = await select_city("chicago")
        
        if isinstance(result, dict):
            if result.get("success") is True:
                test_result("select_city('chicago') - Success", True, f"City: {result.get('city_name')}")
            elif result.get("success") is False:
                test_result("select_city('chicago') - Success", False, f"Error: {result.get('error', 'Unknown')}")
            else:
                # Old format without success field
                if result.get("city_id"):
                    test_result("select_city('chicago') - Success", True, f"City: {result.get('city_name')} (old format)")
                else:
                    test_result("select_city('chicago') - Success", False, "No city_id in response")
        else:
            test_result("select_city('chicago') - Success", False, f"Unexpected return type: {type(result)}")
    except Exception as e:
        test_result("select_city('chicago') - Success", False, f"Exception: {str(e)}")

try:
    asyncio.run(test_select_city())
except Exception as e:
    test_result("select_city() async execution", False, str(e))

print()

# ==================== 8. Test FastAPI App ====================
print("8. Testing FastAPI App...")
print("-" * 80)

try:
    from backend.main import app
    test_result("FastAPI app import", True)
    
    # Check if routers are included
    routes = [route.path for route in app.routes]
    if "/api/city/select/{city_id}" in routes or any("/city" in r for r in routes):
        test_result("City selection route registered", True, f"Found {len([r for r in routes if '/city' in r])} city routes")
    else:
        test_result("City selection route registered", False, "Route not found")
except Exception as e:
    test_result("FastAPI app import", False, str(e))

print()

# ==================== SUMMARY ====================
print("=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print(f"[PASS] Passed: {len(results['passed'])}")
print(f"[FAIL] Failed: {len(results['failed'])}")
print(f"[WARN] Warnings: {len(results['warnings'])}")
print()

if results["failed"]:
    print("FAILED TESTS:")
    print("-" * 80)
    for test in results["failed"]:
        print(f"  [FAIL] {test['name']}: {test['message']}")
    print()

if results["warnings"]:
    print("WARNINGS:")
    print("-" * 80)
    for test in results["warnings"]:
        print(f"  [WARN] {test['name']}: {test['message']}")
    print()

if not results["failed"]:
    print("[SUCCESS] All tests passed! APIs are working correctly.")
else:
    print(f"[WARNING] {len(results['failed'])} test(s) failed. Review the errors above.")
    print()

print("=" * 80)
