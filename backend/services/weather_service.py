"""
Weather Service - OpenWeatherMap API Integration
Fetches current weather and forecasts for zones.
"""
import requests
import os
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import sys
import os as os_module

sys.path.insert(0, os_module.path.dirname(os_module.path.dirname(os_module.path.dirname(os_module.path.abspath(__file__)))))

from src.db.mongo_client import get_db
from backend.services.weather_fallback import get_weather_from_fallback

OPENWEATHER_API_KEY = "f563a728efc99bc4ac7a8fc201c18b25"
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"


class WeatherService:
    """Service for fetching weather data from OpenWeatherMap."""

    def __init__(self):
        self.api_key = OPENWEATHER_API_KEY
        self.base_url = OPENWEATHER_BASE_URL

    def get_current_weather(self, lat: float, lon: float, city_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Get current weather for a location. On API failure or rate limit, uses US_City_Temp_Data.csv fallback.

        Args:
            lat: Latitude
            lon: Longitude
            city_id: Optional city id (nyc, la, sf, etc.) for fallback lookup

        Returns:
            Dictionary with weather data or None on failure
        """
        try:
            url = f"{self.base_url}/weather"
            params = {
                "lat": lat,
                "lon": lon,
                "appid": self.api_key,
                "units": "metric",
            }
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            weather_list = data.get("weather", [{}])
            main = data.get("main", {})
            wind = data.get("wind", {})

            return {
                "temp": main.get("temp"),
                "feels_like": main.get("feels_like"),
                "temp_min": main.get("temp_min"),
                "temp_max": main.get("temp_max"),
                "pressure": main.get("pressure"),
                "humidity": main.get("humidity"),
                "visibility": data.get("visibility"),
                "wind_speed": wind.get("speed"),
                "wind_deg": wind.get("deg"),
                "clouds": data.get("clouds", {}).get("all", 0),
                "description": weather_list[0].get("description", "") if weather_list else "",
                "main": weather_list[0].get("main", "") if weather_list else "",
                "icon": weather_list[0].get("icon", "") if weather_list else "",
                "dt": data.get("dt"),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "location": {
                    "lat": lat,
                    "lon": lon,
                    "name": data.get("name", ""),
                    "country": data.get("sys", {}).get("country", ""),
                },
            }
        except Exception as e:
            print(f"Weather API error: {e}")
            fallback = get_weather_from_fallback(lat, lon, city_id)
            if fallback:
                print("[WeatherService] Using US_City_Temp_Data.csv fallback")
            return fallback

    def get_forecast(self, lat: float, lon: float, days: int = 5) -> Optional[List[Dict[str, Any]]]:
        """
        Get weather forecast for a location (5-day, 3-hour intervals).

        Args:
            lat: Latitude
            lon: Longitude
            days: Number of days (1–5). API returns 5-day; we slice.

        Returns:
            List of forecast entries or None on failure
        """
        try:
            url = f"{self.base_url}/forecast"
            params = {
                "lat": lat,
                "lon": lon,
                "appid": self.api_key,
                "units": "metric",
            }
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            list_ = data.get("list", [])
            forecasts = []
            seen_dates = set()
            days_collected = 0
            max_days = min(5, max(1, days))

            for item in list_:
                if days_collected >= max_days:
                    break
                dt = item.get("dt")
                dt_txt = item.get("dt_txt", "")
                date_key = dt_txt.split()[0] if dt_txt else str(dt)
                if date_key in seen_dates:
                    continue
                seen_dates.add(date_key)
                days_collected += 1

                main = item.get("main", {})
                weather_list = item.get("weather", [{}])
                wind = item.get("wind", {})

                forecasts.append({
                    "dt": dt,
                    "dt_txt": dt_txt,
                    "temp": main.get("temp"),
                    "feels_like": main.get("feels_like"),
                    "temp_min": main.get("temp_min"),
                    "temp_max": main.get("temp_max"),
                    "pressure": main.get("pressure"),
                    "humidity": main.get("humidity"),
                    "wind_speed": wind.get("speed"),
                    "wind_deg": wind.get("deg"),
                    "description": weather_list[0].get("description", "") if weather_list else "",
                    "main": weather_list[0].get("main", "") if weather_list else "",
                    "icon": weather_list[0].get("icon", "") if weather_list else "",
                    "pop": item.get("pop", 0),
                })

            return forecasts
        except Exception as e:
            print(f"Weather forecast API error: {e}")
            return None

    def store_weather_data(self, zone_id: str, lat: float, lon: float) -> bool:
        """
        Fetch and store weather data in MongoDB for a zone.

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

            weather = self.get_current_weather(lat, lon)
            if not weather:
                return False

            doc = {
                "zone_id": zone_id,
                "timestamp": datetime.now(timezone.utc),
                **weather,
            }
            db.weather_data.insert_one(doc)
            return True
        except Exception as e:
            print(f"Error storing weather data: {e}")
            return False
