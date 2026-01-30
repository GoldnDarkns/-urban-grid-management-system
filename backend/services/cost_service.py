"""
Cost computation for city energy, CO2, AQI, and incidents.
Used by /api/city/costs and AI recommendations.
"""
from typing import Dict, Any, Optional

from backend.services.city_config import CityService
from backend.services.eia_service import EIAService
from backend.services.city311_service import City311Service
from backend.services import cost_config
from src.db.mongo_client import get_city_db

_eia = EIAService()
_311 = City311Service()


def compute_costs(city_id: str) -> Dict[str, Any]:
    """
    Compute energy, CO2, AQI, and incident costs for a city.
    Uses processed_zone_data, EIA retail price, and 311 requests.
    Returns energy_usd, co2_usd, aqi_usd, incident_usd, total_usd, etc.
    """
    out: Dict[str, Any] = {
        "energy_usd": 0.0,
        "co2_usd": 0.0,
        "aqi_usd": 0.0,
        "incident_usd": 0.0,
        "total_usd": 0.0,
        "price_per_kwh": cost_config.DEFAULT_PRICE_PER_KWH_USD,
        "total_kwh": 0.0,
        "incident_count": 0,
        "source": "default",
    }
    city = CityService.get_city(city_id)
    if not city:
        return out
    db = get_city_db()
    if db is None:
        return out

    price_per_kwh = _eia.get_retail_price(city.state, sector="RES", limit=12)
    if price_per_kwh is not None:
        out["price_per_kwh"] = round(price_per_kwh, 4)
        out["source"] = "eia"
    else:
        price_per_kwh = cost_config.DEFAULT_PRICE_PER_KWH_USD

    cursor = db.processed_zone_data.find({"city_id": city_id}).sort("timestamp", -1).limit(500)
    zone_latest: Dict[str, Any] = {}
    for doc in cursor:
        zid = doc.get("zone_id")
        if zid not in zone_latest or (doc.get("timestamp") or "") > (zone_latest[zid].get("timestamp") or ""):
            zone_latest[zid] = doc

    total_kwh = 0.0
    aqi_excess = 0.0
    for doc in zone_latest.values():
        f = (doc.get("ml_processed") or {}).get("demand_forecast") or {}
        kwh = f.get("next_hour_kwh")
        if kwh is not None:
            try:
                total_kwh += float(kwh)
            except (TypeError, ValueError):
                pass
        aqi_val = None
        raw_data = doc.get("raw_data") or {}
        aqi_data = raw_data.get("aqi") if isinstance(raw_data, dict) else None
        if isinstance(aqi_data, dict) and aqi_data.get("aqi") is not None:
            try:
                aqi_val = float(aqi_data["aqi"])
            except (TypeError, ValueError):
                pass
        if aqi_val is None:
            ml_processed = doc.get("ml_processed") or {}
            aqi_pred = ml_processed.get("aqi_prediction") if isinstance(ml_processed, dict) else None
            if isinstance(aqi_pred, dict) and aqi_pred.get("next_hour_aqi") is not None:
                try:
                    aqi_val = float(aqi_pred["next_hour_aqi"])
                except (TypeError, ValueError):
                    pass
        if aqi_val is not None and aqi_val > 50:
            aqi_excess += (aqi_val - 50)

    out["total_kwh"] = round(total_kwh, 2)
    out["energy_usd"] = round(total_kwh * price_per_kwh, 2)
    co2_kg = total_kwh * cost_config.KG_CO2_PER_KWH
    out["co2_usd"] = round((co2_kg / 1000.0) * cost_config.CARBON_PRICE_PER_TON_USD, 2)
    out["aqi_usd"] = round(aqi_excess * cost_config.COST_PER_AQI_POINT_ABOVE_50, 2)

    try:
        requests_311 = _311.get_311_requests(city_id=city_id, limit=500, status=None)
        count = len(requests_311) if requests_311 else 0
        out["incident_count"] = count
        out["incident_usd"] = round(count * cost_config.COST_PER_INCIDENT_DEFAULT, 2)
    except Exception:
        out["incident_count"] = 0
        out["incident_usd"] = 0.0

    out["total_usd"] = round(
        out["energy_usd"] + out["co2_usd"] + out["aqi_usd"] + out["incident_usd"], 2
    )
    return out
