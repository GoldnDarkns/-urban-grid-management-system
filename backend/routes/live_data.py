"""
Live Data API Routes - External API integrations
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.services.weather_service import WeatherService
from backend.services.aqi_service import AQIService
from backend.services.traffic_service import TrafficService
from backend.services.infrastructure_service import InfrastructureService
from backend.services.population_service import PopulationService
from backend.services.energy_grid_service import EnergyGridService
from backend.services.eia_service import EIAService
from backend.services.city311_service import City311Service
from backend.routes.data import safe_get_db

router = APIRouter(prefix="/api/live", tags=["Live Data"])

# Initialize services
weather_service = WeatherService()
aqi_service = AQIService()
traffic_service = TrafficService()
infrastructure_service = InfrastructureService()
population_service = PopulationService()
energy_grid_service = EnergyGridService()
eia_service = EIAService()  # Will use API key from environment or user input
city311_service = City311Service()  # Default to NYC, can be changed

@router.get("/weather/current")
async def get_current_weather(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    city_id: Optional[str] = Query(None, description="City ID for fallback (e.g. nyc, la)")
):
    """Get current weather for a location. Uses US_City_Temp_Data fallback on API failure if city_id provided."""
    try:
        weather = weather_service.get_current_weather(lat, lon, city_id)
        if not weather:
            raise HTTPException(status_code=404, detail="Weather data not available")
        return {"weather": weather}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/weather/forecast")
async def get_weather_forecast(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    days: int = Query(5, ge=1, le=5, description="Number of days (max 5)")
):
    """Get weather forecast for a location."""
    try:
        forecast = weather_service.get_forecast(lat, lon, days)
        return {"forecast": forecast, "days": days}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/aqi/current")
async def get_current_aqi(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    """Get current AQI for a location."""
    try:
        aqi = aqi_service.get_current_aqi(lat, lon)
        if not aqi:
            raise HTTPException(status_code=404, detail="AQI data not available")
        return {"aqi": aqi}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/traffic/flow")
async def get_traffic_flow(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    """Get traffic flow data for a location."""
    try:
        traffic = traffic_service.get_traffic_flow(lat, lon)
        if not traffic:
            raise HTTPException(status_code=404, detail="Traffic data not available")
        return {"traffic": traffic}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/traffic/incidents")
async def get_traffic_incidents(
    bbox: str = Query(..., description="Bounding box: minLat,minLon,maxLat,maxLon")
):
    """Get traffic incidents in a bounding box."""
    try:
        incidents = traffic_service.get_traffic_incidents(bbox)
        return {"incidents": incidents, "count": len(incidents)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/infrastructure/buildings")
async def get_buildings(
    bbox: str = Query(..., description="Bounding box: south,west,north,east")
):
    """Get buildings in an area from OpenStreetMap."""
    try:
        buildings = infrastructure_service.get_buildings_in_area(bbox)
        return {"buildings": buildings, "count": len(buildings)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/infrastructure/critical")
async def get_critical_infrastructure(
    bbox: str = Query(..., description="Bounding box: south,west,north,east")
):
    """Get critical infrastructure (hospitals, schools, etc.) in an area."""
    try:
        infrastructure = infrastructure_service.get_critical_infrastructure(bbox)
        return {"infrastructure": infrastructure}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/population/zipcode/{zipcode}")
async def get_population_by_zipcode(zipcode: str):
    """Get population data for a ZIP code."""
    try:
        population = population_service.get_population_by_zipcode(zipcode)
        if not population:
            raise HTTPException(status_code=404, detail="Population data not available")
        return {"population": population}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/311/requests")
async def get_311_requests(
    city_id: Optional[str] = Query(None, description="City ID (e.g. nyc, chicago). Uses NYC if omitted."),
    limit: int = Query(50, ge=1, le=500),
    status: Optional[str] = Query(None, description="Filter by status")
):
    """Get 311 service requests for a city."""
    try:
        requests = city311_service.get_311_requests(city_id=city_id or "nyc", limit=limit, status=status)
        return {"requests": requests, "count": len(requests)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/311/power-outages")
async def get_power_outage_requests(limit: int = Query(50, ge=1, le=200)):
    """Get power outage related 311 requests."""
    try:
        requests = city311_service.get_power_outage_requests(limit=limit)
        return {"outages": requests, "count": len(requests)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/eia/retail-price")
async def get_eia_retail_price(
    state: str = Query(..., description="State code (e.g. NY, CA)"),
    sector: str = Query("RES", description="Sector: RES, COM, IND, ALL")
):
    """Get latest average retail electricity price ($/kWh) for a state and sector."""
    try:
        price = eia_service.get_retail_price(state=state, sector=sector, limit=12)
        if price is None:
            raise HTTPException(status_code=404, detail="EIA retail price not available")
        return {"state": state, "sector": sector, "price_per_kwh_usd": price}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/eia/electricity")
async def get_eia_electricity(
    state: Optional[str] = Query(None, description="State code (e.g., CA, NY)"),
    frequency: str = Query("monthly", description="Frequency: monthly or annual"),
    limit: int = Query(100, ge=1, le=5000)
):
    """Get EIA electricity operational data."""
    try:
        data = eia_service.get_electricity_operational_data(
            state=state,
            frequency=frequency,
            limit=limit
        )
        if not data:
            raise HTTPException(status_code=404, detail="EIA electricity data not available. Check API key.")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/eia/co2-emissions")
async def get_eia_co2_emissions(
    state: Optional[str] = Query(None, description="State code (e.g., CA, NY)"),
    frequency: str = Query("annual", description="Frequency: annual or monthly"),
    limit: int = Query(100, ge=1, le=5000)
):
    """Get EIA state-level CO2 emissions data."""
    try:
        data = eia_service.get_state_co2_emissions(
            state=state,
            frequency=frequency,
            limit=limit
        )
        if not data:
            raise HTTPException(status_code=404, detail="EIA CO2 emissions data not available. Check API key.")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/eia/international")
async def get_eia_international(
    country: Optional[str] = Query(None, description="Country code (e.g., USA, CHN)"),
    product: Optional[str] = Query(None, description="Product: petroleum, natural-gas, electricity, coal"),
    frequency: str = Query("monthly", description="Frequency: monthly or annual"),
    limit: int = Query(100, ge=1, le=5000)
):
    """Get EIA international country-level consumption data."""
    try:
        data = eia_service.get_international_consumption(
            country=country,
            product=product,
            frequency=frequency,
            limit=limit
        )
        if not data:
            raise HTTPException(status_code=404, detail="EIA international data not available. Check API key.")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync/zone/{zone_id}")
async def sync_zone_data(
    zone_id: str,
    lat: float = Query(..., description="Zone latitude"),
    lon: float = Query(..., description="Zone longitude"),
    state: Optional[str] = Query(None, description="State code for EIA data (e.g., CA, NY)")
):
    """Sync all live data for a zone (weather, AQI, traffic, EIA if state provided)."""
    try:
        results = {
            "zone_id": zone_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "weather": weather_service.store_weather_data(zone_id, lat, lon),
            "aqi": aqi_service.store_aqi_data(zone_id, lat, lon),
            "traffic": traffic_service.store_traffic_data(zone_id, lat, lon)
        }
        
        # Add EIA data if state is provided
        if state:
            results["eia_electricity"] = eia_service.store_electricity_data(zone_id, state)
        
        return {"sync": results, "success": all([results["weather"], results["aqi"], results["traffic"]])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
