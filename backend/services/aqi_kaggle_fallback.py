"""
AQI Kaggle Dataset Fallback
Loads AQI data from a Kaggle CSV dataset when AirVisual API is rate-limited.
Supports datasets with lat/lon and AQI values.
"""
import csv
import os
import math
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from pathlib import Path

# Path to Kaggle AQI dataset CSV — env, or user's file (Kaggle_Aqi_Downloaded.csv), or default
def _resolve_csv_path() -> Path:
    env_path = os.getenv("KAGGLE_AQI_CSV_PATH", "").strip()
    if env_path and Path(env_path).exists():
        return Path(env_path)
    # Try user's file first (data/Kaggle_Aqi_Downloaded.csv), then default
    for candidate in ["data/Kaggle_Aqi_Downloaded.csv", "data/kaggle_aqi.csv"]:
        p = Path(candidate)
        if p.exists():
            return p
    return Path(env_path or "data/kaggle_aqi.csv")

# In-memory cache of loaded dataset
_aqi_dataset_cache: Optional[List[Dict[str, Any]]] = None


def _safe_int(val: Any, default: int = 50) -> int:
    """Parse int from CSV value; empty string or invalid returns default."""
    if val is None or (isinstance(val, str) and not val.strip()):
        return default
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default


def _safe_float(val: Any, default: float = 0.0) -> float:
    """Parse float from CSV value."""
    if val is None or (isinstance(val, str) and not val.strip()):
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _load_kaggle_dataset() -> List[Dict[str, Any]]:
    """
    Load AQI dataset from Kaggle CSV file.
    Supports: lat/lon/aqi/pm25 style and EPA style (Latitude, Longitude, AQI, Arithmetic Mean, City Name).
    """
    global _aqi_dataset_cache
    
    if _aqi_dataset_cache is not None:
        return _aqi_dataset_cache
    
    dataset_path = _resolve_csv_path()
    if not dataset_path.exists():
        print(f"[AQIKaggleFallback] Dataset not found at {dataset_path}")
        _aqi_dataset_cache = []
        return []
    
    try:
        records = []
        with open(dataset_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    # Normalize column names (handle variations + EPA: Latitude, Longitude, AQI, Arithmetic Mean)
                    lat = _safe_float(row.get('lat') or row.get('latitude') or row.get('Latitude'), 0.0)
                    lon = _safe_float(row.get('lon') or row.get('longitude') or row.get('Longitude'), 0.0)
                    if lat == 0 and lon == 0:
                        continue
                    # AQI: support empty (use 50) and EPA "AQI" column
                    aqi_val = row.get('aqi') or row.get('AQI') or row.get('aqius')
                    aqi = _safe_int(aqi_val, 50)
                    # PM2.5: Arithmetic Mean (EPA) or pm25/PM2.5
                    pm25 = _safe_float(row.get('pm25') or row.get('PM2.5') or row.get('pm2_5') or row.get('Arithmetic Mean'), 0.0)
                    if aqi == 50 and pm25 > 0:
                        # Rough PM2.5 (ug/m3) to AQI: 0-12->0-50, 12-35->51-100, 35-55->101-150
                        if pm25 <= 12: aqi = max(1, int(pm25 * (50 / 12)))
                        elif pm25 <= 35.4: aqi = int(50 + (pm25 - 12) * (50 / 23.4))
                        elif pm25 <= 55.4: aqi = int(100 + (pm25 - 35.4) * (50 / 20))
                        else: aqi = min(500, int(150 + (pm25 - 55.4) * 2))
                    records.append({
                        'lat': lat,
                        'lon': lon,
                        'aqi': aqi,
                        'aqi_cn': aqi,
                        'pm25': pm25,
                        'pm10': _safe_float(row.get('pm10') or row.get('PM10'), 0.0),
                        'o3': _safe_float(row.get('o3') or row.get('O3') or row.get('ozone'), 0.0),
                        'no2': _safe_float(row.get('no2') or row.get('NO2'), 0.0),
                        'so2': _safe_float(row.get('so2') or row.get('SO2'), 0.0),
                        'co': _safe_float(row.get('co') or row.get('CO'), 0.0),
                        'city': (row.get('city') or row.get('City') or row.get('City Name') or 'Unknown').strip() or 'Unknown',
                        'state': (row.get('state') or row.get('State') or row.get('State Name') or '').strip(),
                        'date': (row.get('date') or row.get('Date') or row.get('Date Local') or '').strip(),
                    })
                except (ValueError, KeyError):
                    continue
        
        _aqi_dataset_cache = records
        print(f"[AQIKaggleFallback] Loaded {len(records)} AQI records from {dataset_path.name}")
        return records
    except Exception as e:
        print(f"[AQIKaggleFallback] Error loading dataset: {e}")
        _aqi_dataset_cache = []
        return []


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two lat/lon points in kilometers."""
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c


def get_aqi_from_kaggle(lat: float, lon: float, max_distance_km: float = 50.0) -> Optional[Dict[str, Any]]:
    """
    Get AQI data from Kaggle dataset by finding nearest record to given lat/lon.
    
    Args:
        lat: Target latitude
        lon: Target longitude
        max_distance_km: Maximum distance to search (default 50km)
    
    Returns:
        AQI data dict or None if no nearby record found
    """
    dataset = _load_kaggle_dataset()
    if not dataset:
        return None
    
    # Find nearest record
    nearest = None
    min_dist = float('inf')
    
    for record in dataset:
        dist = _haversine_distance(lat, lon, record['lat'], record['lon'])
        if dist < min_dist and dist <= max_distance_km:
            min_dist = dist
            nearest = record
    
    if nearest is None:
        return None
    
    # Return in same format as AirVisual API
    return {
        "aqi": nearest['aqi'],
        "aqi_cn": nearest['aqi_cn'],
        "pm25": nearest['pm25'],
        "pm10": nearest['pm10'],
        "o3": nearest['o3'],
        "no2": nearest['no2'],
        "so2": nearest['so2'],
        "co": nearest['co'],
        "temperature": 0,  # Not in dataset
        "humidity": 0,
        "pressure": 0,
        "wind_speed": 0,
        "wind_direction": 0,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "location": {
            "lat": nearest['lat'],
            "lon": nearest['lon'],
            "city": nearest['city'],
        },
        "source": "kaggle_dataset",
        "distance_km": round(min_dist, 2),
    }
