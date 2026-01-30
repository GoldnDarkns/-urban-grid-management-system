"""
Traffic Service - TomTom API Integration
Fetches real-time traffic data
"""
import requests
import os
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import sys
import os as os_module

sys.path.insert(0, os_module.path.dirname(os_module.path.dirname(os_module.path.dirname(os_module.path.abspath(__file__)))))

from src.db.mongo_client import get_db
from backend.services.traffic_fallback import get_traffic_from_fallback

# TomTom API Key - Updated to user's key
TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY", "kvjQ5toeiGfWgVJWO9LrzV2WRBgKBqUK")
TOMTOM_BASE_URL = "https://api.tomtom.com/traffic/services/4"

class TrafficService:
    """Service for fetching traffic data from TomTom"""
    
    def __init__(self):
        self.api_key = os.getenv("TOMTOM_API_KEY", TOMTOM_API_KEY)
        self.base_url = TOMTOM_BASE_URL
    
    def get_traffic_flow(self, lat: float, lon: float, radius: int = 5000) -> Optional[Dict[str, Any]]:
        """
        Get traffic flow data for a location. On API failure (400/429/etc.), uses traffic_speed CSV fallback.
        
        Args:
            lat: Latitude
            lon: Longitude
            radius: Radius in meters (default 5km)
            
        Returns:
            Dictionary with traffic flow data
        """
        try:
            url = f"{self.base_url}/flowSegmentData/absolute/10/json"
            params = {
                "point": f"{lat},{lon}",
                "key": self.api_key,
                "unit": "KMPH"
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            flow = data.get("flowSegmentData", {})
            
            return {
                "frc": flow.get("frc", ""),  # Functional Road Class
                "current_speed": flow.get("currentSpeed", 0),
                "free_flow_speed": flow.get("freeFlowSpeed", 0),
                "confidence": flow.get("confidence", 0),
                "road_closure": flow.get("roadClosure", False),
                "coordinates": {
                    "lat": lat,
                    "lon": lon
                },
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            print(f"Traffic API error: {e}")
            fallback = get_traffic_from_fallback(lat, lon)
            if fallback:
                print("[TrafficService] Using traffic_speed CSV fallback")
            return fallback
    
    def get_traffic_incidents(self, bbox: str) -> List[Dict[str, Any]]:
        """
        Get traffic incidents in a bounding box.
        
        Args:
            bbox: Bounding box as "minLat,minLon,maxLat,maxLon"
            
        Returns:
            List of traffic incidents
        """
        try:
            url = f"{self.base_url}/incidentDetails/s3"
            params = {
                "key": self.api_key,
                "bbox": bbox,
                "fields": "{incidents{type,geometry,properties}}",
                "language": "en-US"
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            incidents = []
            
            for incident in data.get("incidents", []):
                props = incident.get("properties", {})
                incidents.append({
                    "type": props.get("type", "unknown"),
                    "severity": props.get("severity", {}).get("value", 0),
                    "description": props.get("description", ""),
                    "start_time": props.get("startTime", ""),
                    "end_time": props.get("endTime", ""),
                    "coordinates": incident.get("geometry", {}).get("coordinates", []),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
            
            return incidents
        except Exception as e:
            print(f"Traffic incidents API error: {e}")
            return []
    
    def calculate_congestion_level(self, current_speed: float, free_flow_speed: float) -> str:
        """
        Calculate congestion level from speed data.
        
        Args:
            current_speed: Current traffic speed
            free_flow_speed: Free flow speed
            
        Returns:
            Congestion level: "free", "moderate", "heavy", "severe"
        """
        if free_flow_speed == 0:
            return "unknown"
        
        ratio = current_speed / free_flow_speed
        
        if ratio >= 0.9:
            return "free"
        elif ratio >= 0.7:
            return "moderate"
        elif ratio >= 0.5:
            return "heavy"
        else:
            return "severe"
    
    def store_traffic_data(self, zone_id: str, lat: float, lon: float) -> bool:
        """
        Fetch and store traffic data in MongoDB for a zone.
        
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
            
            traffic = self.get_traffic_flow(lat, lon)
            if not traffic:
                return False
            
            # Calculate congestion
            congestion = self.calculate_congestion_level(
                traffic.get("current_speed", 0),
                traffic.get("free_flow_speed", 0)
            )
            
            # Store in MongoDB
            traffic_doc = {
                "zone_id": zone_id,
                "timestamp": datetime.now(timezone.utc),
                "congestion_level": congestion,
                "current_speed": traffic.get("current_speed", 0),
                "free_flow_speed": traffic.get("free_flow_speed", 0),
                "confidence": traffic.get("confidence", 0),
                "road_closure": traffic.get("road_closure", False),
                "source": "tomtom"
            }
            
            db.traffic_data.insert_one(traffic_doc)
            return True
        except Exception as e:
            print(f"Error storing traffic data: {e}")
            return False
