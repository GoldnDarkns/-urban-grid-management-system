"""
Weather fallback from US_City_Temp_Data.csv when OpenWeatherMap fails or is rate-limited.
"""
import os
from datetime import datetime, timezone
from typing import Dict, Any, Optional

# Project root (parent of backend)
_here = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.dirname(os.path.dirname(_here))

# city_id (from app) -> column name in US_City_Temp_Data.csv
_CITY_TO_COLUMN = {
    "nyc": "new_york",
    "new_york": "new_york",
    "la": "los_angeles",
    "los_angeles": "los_angeles",
    "sf": "san_francisco",
    "san_francisco": "san_francisco",
    "chicago": "chicago",
    "houston": "dallas",  # no houston column, use dallas
    "phoenix": "phoenix",
    "dallas": "dallas",
    "denver": "denver",
    "boston": "boston",
    "atlanta": "atlanta",
    "seattle": "seattle",
    "miami": "miami",
    "detroit": "detroit",
    "minneapolis": "minneapolis",
    "portland": "portland",
    "tampa": "tampa",
    "san_antonio": "san_antonio",
    "las_vegas": "las_vegas",
    "sacramento": "sacramento",
    "indianapolis": "indianapolis",
    "charlotte": "charlotte",
    "new_orleans": "new_orleans",
    "reno": "reno",
    "oklahoma_city": "oklahoma_city",
    "buffalo": "buffalo",
    "anchorage": "anchorage",
    "honolulu": "honolulu",
}

_weather_df = None


def _data_path(*parts: str) -> str:
    for base in (_project_root, os.getcwd(), "/app"):
        p = os.path.join(base, "data", *parts)
        if os.path.isfile(p):
            return p
    return os.path.join(_project_root, "data", *parts)


def _load_weather_fallback() -> Optional[Any]:
    global _weather_df
    if _weather_df is not None:
        return _weather_df
    try:
        import pandas as pd
        path = _data_path("US_City_Temp_Data.csv")
        if not os.path.isfile(path):
            return None
        df = pd.read_csv(path)
        if df is None or df.empty or "time" not in df.columns:
            return None
        df["time"] = pd.to_datetime(df["time"], errors="coerce")
        df = df.dropna(subset=["time"]).sort_values("time", ascending=False)
        _weather_df = df
        return _weather_df
    except Exception as e:
        print(f"[WeatherFallback] Load error: {e}")
        return None


def get_weather_from_fallback(lat: float, lon: float, city_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Return weather-like dict from US_City_Temp_Data.csv (monthly mean temp by US city).
    Same shape as OpenWeatherMap response so downstream code works unchanged.
    """
    df = _load_weather_fallback()
    if df is None:
        return None
    col = None
    if city_id:
        c = str(city_id).lower().replace(" ", "_")
        col = _CITY_TO_COLUMN.get(c)
    if not col or col not in df.columns:
        col = "new_york"
    try:
        row = df.iloc[0]
        temp = float(row.get(col, row.get("new_york", 15.0)))
    except (IndexError, TypeError, ValueError):
        temp = 15.0
    return {
        "temp": temp,
        "feels_like": temp,
        "temp_min": temp - 2,
        "temp_max": temp + 2,
        "pressure": 1013,
        "humidity": 65,
        "visibility": 10000,
        "wind_speed": 3.5,
        "wind_deg": 270,
        "clouds": 40,
        "description": "fallback from dataset",
        "main": "Clouds",
        "icon": "03d",
        "dt": None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "location": {"lat": lat, "lon": lon, "name": "", "country": "US"},
        "source": "weather_fallback",
    }
