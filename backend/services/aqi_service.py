"""
AQI Service - Air Quality Index API Integration
Fetches real-time air quality data from sensors.
On 429 (rate limit) or API failure, returns synthetic AQI so processing continues.
OpenAQ fallback disabled (v2 API returns 410 Gone).
"""
import requests
import os
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import sys
import os as os_module

sys.path.insert(0, os_module.path.dirname(os_module.path.dirname(os_module.path.dirname(os_module.path.abspath(__file__)))))

from src.db.mongo_client import get_db
from backend.services.aqi_kaggle_fallback import get_aqi_from_kaggle

# AirVisual API Key (IQAir)
AIRVISUAL_API_KEY = "eeb3ecd8-2b17-4d80-8bcf-ae2ea0d81d72"
AIRVISUAL_BASE_URL = "https://api.airvisual.com/v2"

# Throttle duplicate error logs (once per 60s)
_last_log_time: float = 0
_log_interval_sec: float = 60.0


def _log_aqi_error(msg: str) -> None:
    global _last_log_time
    now = time.time()
    if now - _last_log_time >= _log_interval_sec:
        print(msg)
        _last_log_time = now


def _synthetic_aqi(lat: float, lon: float, reason: str) -> Dict[str, Any]:
    """Return synthetic AQI so processing continues when API fails or is rate-limited."""
    return {
        "aqi": 50,
        "aqi_cn": 50,
        "pm25": 12,
        "pm10": 20,
        "o3": 0,
        "no2": 0,
        "so2": 0,
        "co": 0,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "synthetic",
        "reason": reason,
        "location": {"lat": lat, "lon": lon, "city": "Unknown"},
    }


class AQIService:
    """Service for fetching air quality data from AirVisual (IQAir)"""

    def __init__(self):
        self.api_key = AIRVISUAL_API_KEY
        self.base_url = AIRVISUAL_BASE_URL

    def get_current_aqi(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """
        Get current AQI for a location.
        On 429 rate limit or API failure, returns synthetic AQI (no OpenAQ fallback).
        """
        try:
            url = f"{self.base_url}/nearest_city"
            params = {"lat": lat, "lon": lon, "key": self.api_key}
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            if data.get("status") == "success":
                current = data.get("data", {}).get("current", {})
                pollution = current.get("pollution", {})
                weather = current.get("weather", {})
                return {
                    "aqi": pollution.get("aqius", 0),
                    "aqi_cn": pollution.get("aqicn", 0),
                    "pm25": pollution.get("p2", 0),
                    "pm10": pollution.get("p1", 0),
                    "o3": pollution.get("o3", 0),
                    "no2": pollution.get("n2", 0),
                    "so2": pollution.get("s2", 0),
                    "co": pollution.get("co", 0),
                    "temperature": weather.get("tp", 0),
                    "humidity": weather.get("hu", 0),
                    "pressure": weather.get("pr", 0),
                    "wind_speed": weather.get("ws", 0),
                    "wind_direction": weather.get("wd", 0),
                    "timestamp": pollution.get("ts", datetime.now(timezone.utc).isoformat()),
                    "location": {
                        "lat": lat,
                        "lon": lon,
                        "city": data.get("data", {}).get("city", "Unknown"),
                    },
                }
            return _synthetic_aqi(lat, lon, "airvisual_no_success")
        except requests.HTTPError as e:
            if e.response is not None and e.response.status_code == 429:
                _log_aqi_error(
                    "AQI API 429 Too Many Requests (AirVisual rate limit). "
                    "Trying Kaggle dataset fallback..."
                )
                # Try Kaggle dataset first
                kaggle_aqi = get_aqi_from_kaggle(lat, lon)
                if kaggle_aqi:
                    print(f"[AQIService] Using Kaggle dataset AQI (distance: {kaggle_aqi.get('distance_km', 0)}km)")
                    return kaggle_aqi
                # Fallback to synthetic if Kaggle also fails
                return _synthetic_aqi(lat, lon, "rate_limited")
            _log_aqi_error(f"AQI API HTTP error: {e}")
            # Try Kaggle dataset on other HTTP errors too
            kaggle_aqi = get_aqi_from_kaggle(lat, lon)
            if kaggle_aqi:
                return kaggle_aqi
            return _synthetic_aqi(lat, lon, "http_error")
        except Exception as e:
            _log_aqi_error(f"AQI API error: {e}")
            # Try Kaggle dataset on any error
            kaggle_aqi = get_aqi_from_kaggle(lat, lon)
            if kaggle_aqi:
                return kaggle_aqi
            return _synthetic_aqi(lat, lon, "error")

    def store_aqi_data(self, zone_id: str, lat: float, lon: float) -> bool:
        """
        Fetch and store AQI data in MongoDB for a zone.
        
        Args:
            zone_id: Zone identifier
            lat: Latitude
            lon: Longitude
            
        Returns:
            True if successful
        """
        try:
            db = get_db()
            if db is None:
                return False
            
            aqi_data = self.get_current_aqi(lat, lon)
            if not aqi_data:
                return False
            
            # Store in MongoDB
            aqi_doc = {
                "zone_id": zone_id,
                "timestamp": datetime.now(timezone.utc),
                **aqi_data
            }
            
            db.aqi_data.insert_one(aqi_doc)
            return True
        except Exception as e:
            print(f"Error storing AQI data: {e}")
            return False
