"""
Infrastructure Service - OpenStreetMap Integration
Fetches real city infrastructure data (no API key needed)
"""
import requests
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
import sys
import os as os_module

sys.path.insert(0, os_module.path.dirname(os_module.path.dirname(os_module.path.dirname(os_module.path.abspath(__file__)))))

from src.db.mongo_client import get_db

class InfrastructureService:
    """Service for fetching city infrastructure from OpenStreetMap"""
    
    def __init__(self):
        self.overpass_url = "https://overpass-api.de/api/interpreter"
    
    def get_buildings_in_area(self, bbox: str) -> List[Dict[str, Any]]:
        """
        Get buildings in a bounding box.
        
        Args:
            bbox: Bounding box as "south,west,north,east"
            
        Returns:
            List of building data
        """
        try:
            query = f"""
            [out:json][timeout:25];
            (
              way["building"]({bbox});
            );
            out body;
            >;
            out skel qt;
            """
            
            response = requests.post(
                self.overpass_url,
                data={"data": query},
                timeout=30
            )
            response.raise_for_status()
            
            data = response.json()
            buildings = []
            
            for element in data.get("elements", []):
                if element.get("type") == "way" and "tags" in element:
                    buildings.append({
                        "id": element.get("id"),
                        "type": element.get("tags", {}).get("building", "unknown"),
                        "coordinates": element.get("geometry", []),
                        "tags": element.get("tags", {})
                    })
            
            return buildings
        except Exception as e:
            print(f"OpenStreetMap API error: {e}")
            return []
    
    def get_critical_infrastructure(self, bbox: str) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get critical infrastructure (hospitals, schools, etc.) in an area.
        
        Args:
            bbox: Bounding box as "south,west,north,east"
            
        Returns:
            Dictionary with infrastructure by type
        """
        try:
            query = f"""
            [out:json][timeout:25];
            (
              node["amenity"="hospital"]({bbox});
              node["amenity"="school"]({bbox});
              node["amenity"="university"]({bbox});
              node["emergency"="fire_station"]({bbox});
              node["amenity"="police"]({bbox});
            );
            out body;
            """
            
            response = requests.post(
                self.overpass_url,
                data={"data": query},
                timeout=30
            )
            response.raise_for_status()
            
            data = response.json()
            infrastructure = {
                "hospitals": [],
                "schools": [],
                "universities": [],
                "fire_stations": [],
                "police_stations": []
            }
            
            for element in data.get("elements", []):
                if element.get("type") == "node":
                    tags = element.get("tags", {})
                    amenity = tags.get("amenity", "")
                    emergency = tags.get("emergency", "")
                    
                    item = {
                        "id": element.get("id"),
                        "name": tags.get("name", "Unknown"),
                        "lat": element.get("lat"),
                        "lon": element.get("lon"),
                        "tags": tags
                    }
                    
                    if amenity == "hospital":
                        infrastructure["hospitals"].append(item)
                    elif amenity == "school":
                        infrastructure["schools"].append(item)
                    elif amenity == "university":
                        infrastructure["universities"].append(item)
                    elif emergency == "fire_station":
                        infrastructure["fire_stations"].append(item)
                    elif amenity == "police":
                        infrastructure["police_stations"].append(item)
            
            return infrastructure
        except Exception as e:
            print(f"OpenStreetMap infrastructure error: {e}")
            return {}
