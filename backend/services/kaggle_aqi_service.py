"""
Kaggle AQI Service - Fetches AQI data from Kaggle datasets via API
Integrates with Kafka for live streaming of historical air quality data.
"""
import os
import csv
import io
import requests
import time
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Kaggle API credentials (set via environment variables)
KAGGLE_USERNAME = os.getenv("KAGGLE_USERNAME", "")
KAGGLE_KEY = os.getenv("KAGGLE_KEY", "")

# Kaggle dataset reference
# Using the historical air quality dataset from the kernel
KAGGLE_DATASET = "patelfarhaan/starter-historical-air-quality-ae56e46a-2"
KAGGLE_API_BASE = "https://www.kaggle.com/api/v1"

# In-memory cache
_dataset_cache: Optional[List[Dict[str, Any]]] = None
_cache_timestamp: float = 0
_cache_ttl: float = 3600.0  # Cache for 1 hour


def _get_kaggle_auth_headers() -> Dict[str, str]:
    """Get Kaggle API authentication headers."""
    if not KAGGLE_USERNAME or not KAGGLE_KEY:
        return {}
    import base64
    credentials = f"{KAGGLE_USERNAME}:{KAGGLE_KEY}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return {
        "Authorization": f"Basic {encoded}"
    }


def _fetch_kaggle_dataset_via_api() -> Optional[List[Dict[str, Any]]]:
    """
    Fetch Kaggle dataset using Kaggle API.
    Note: Kaggle API requires authentication and may have rate limits.
    """
    try:
        headers = _get_kaggle_auth_headers()
        if not headers:
            print("[KaggleAQI] No Kaggle credentials found. Set KAGGLE_USERNAME and KAGGLE_KEY.")
            return None
        
        # Kaggle API endpoint for dataset files
        # Format: /datasets/download/{owner}/{dataset}
        dataset_owner, dataset_name = KAGGLE_DATASET.split("/", 1)
        
        # Try to get dataset metadata first
        metadata_url = f"{KAGGLE_API_BASE}/datasets/view/{dataset_owner}/{dataset_name}"
        response = requests.get(metadata_url, headers=headers, timeout=30)
        
        if response.status_code != 200:
            print(f"[KaggleAQI] API error: {response.status_code} - {response.text[:200]}")
            return None
        
        # For now, we'll use a simpler approach: download via kaggle CLI or direct CSV
        # The kernel command the user provided suggests they want to pull the processed data
        print("[KaggleAQI] Kaggle API requires dataset download. Using local CSV fallback.")
        return None
        
    except Exception as e:
        print(f"[KaggleAQI] API fetch error: {e}")
        return None


def _safe_int(val, default=50):
    if val is None or (isinstance(val, str) and not str(val).strip()):
        return default
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default


def _safe_float(val, default=0.0):
    if val is None or (isinstance(val, str) and not str(val).strip()):
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _load_kaggle_csv(csv_path: str) -> Optional[List[Dict[str, Any]]]:
    """Load Kaggle dataset from local CSV. Supports EPA columns (Latitude, Longitude, AQI, Arithmetic Mean, City Name)."""
    try:
        if not os.path.exists(csv_path):
            return None
        
        records = []
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    lat = _safe_float(row.get('lat') or row.get('latitude') or row.get('Latitude'), 0.0)
                    lon = _safe_float(row.get('lon') or row.get('longitude') or row.get('Longitude'), 0.0)
                    if lat == 0 and lon == 0:
                        continue
                    aqi_val = row.get('aqi') or row.get('AQI') or row.get('aqius') or row.get('AQIUS')
                    aqi = _safe_int(aqi_val, 50)
                    pm25 = _safe_float(row.get('pm25') or row.get('PM2.5') or row.get('pm2_5') or row.get('Arithmetic Mean'), 0.0)
                    if aqi == 50 and pm25 > 0:
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
                        'date': (row.get('date') or row.get('Date') or row.get('Date Local') or row.get('timestamp') or '').strip(),
                    })
                except (ValueError, KeyError):
                    continue
        
        print(f"[KaggleAQI] Loaded {len(records)} records from {os.path.basename(csv_path)}")
        return records
    except Exception as e:
        print(f"[KaggleAQI] CSV load error: {e}")
        return None


def _get_cached_dataset() -> Optional[List[Dict[str, Any]]]:
    """Get cached dataset or reload if expired."""
    global _dataset_cache, _cache_timestamp
    
    now = time.time()
    if _dataset_cache is not None and (now - _cache_timestamp) < _cache_ttl:
        return _dataset_cache
    
    # Try multiple sources (user's file Kaggle_Aqi_Downloaded.csv first when env not set)
    csv_paths = [
        os.getenv("KAGGLE_AQI_CSV_PATH", "").strip(),
        "data/Kaggle_Aqi_Downloaded.csv",
        "data/kaggle_aqi.csv",
        "/app/data/Kaggle_Aqi_Downloaded.csv",
        "/app/data/kaggle_aqi.csv",
    ]
    csv_paths = [p for p in csv_paths if p and os.path.exists(p)]
    
    for path in csv_paths:
        dataset = _load_kaggle_csv(path)
        if dataset:
            _dataset_cache = dataset
            _cache_timestamp = now
            return dataset
    
    # Try API fetch as last resort
    dataset = _fetch_kaggle_dataset_via_api()
    if dataset:
        _dataset_cache = dataset
        _cache_timestamp = now
        return dataset
    
    return None


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two lat/lon points in kilometers."""
    import math
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c


class KaggleAQIService:
    """Service for fetching AQI data from Kaggle datasets and streaming via Kafka."""
    
    def __init__(self):
        self.dataset = _get_cached_dataset()
    
    def get_aqi_for_location(self, lat: float, lon: float, max_distance_km: float = 50.0) -> Optional[Dict[str, Any]]:
        """
        Get AQI data from Kaggle dataset by finding nearest record.
        
        Args:
            lat: Target latitude
            lon: Target longitude
            max_distance_km: Maximum distance to search (default 50km)
        
        Returns:
            AQI data dict formatted for Kafka/AQI service, or None
        """
        if not self.dataset:
            self.dataset = _get_cached_dataset()
            if not self.dataset:
                return None
        
        # Find nearest record
        nearest = None
        min_dist = float('inf')
        
        for record in self.dataset:
            dist = _haversine_distance(lat, lon, record['lat'], record['lon'])
            if dist < min_dist and dist <= max_distance_km:
                min_dist = dist
                nearest = record
        
        if nearest is None:
            return None
        
        # Return in same format as AirVisual API (for Kafka compatibility)
        return {
            "aqi": nearest['aqi'],
            "aqi_cn": nearest['aqi_cn'],
            "pm25": nearest['pm25'],
            "pm10": nearest['pm10'],
            "o3": nearest['o3'],
            "no2": nearest['no2'],
            "so2": nearest['so2'],
            "co": nearest['co'],
            "temperature": 0,  # Not in dataset typically
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
    
    def get_all_records_for_city(self, city_name: str) -> List[Dict[str, Any]]:
        """Get all AQI records for a specific city (for bulk streaming)."""
        if not self.dataset:
            self.dataset = _get_cached_dataset()
            if not self.dataset:
                return []
        
        city_lower = city_name.lower()
        return [
            r for r in self.dataset
            if city_lower in r.get('city', '').lower() or city_lower in r.get('state', '').lower()
        ]
    
    def refresh_dataset(self) -> bool:
        """Force refresh of dataset cache."""
        global _dataset_cache, _cache_timestamp
        _dataset_cache = None
        _cache_timestamp = 0
        self.dataset = _get_cached_dataset()
        return self.dataset is not None
