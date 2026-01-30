"""
City Configuration Service
Manages city selection and coordinates for zones
"""
from typing import Dict, List, Optional
from dataclasses import dataclass
import requests
import time

@dataclass
class CityConfig:
    """City configuration with coordinates and API settings"""
    id: str
    name: str
    state: str
    country: str
    center_lat: float
    center_lon: float
    bbox: str  # Format: "south,west,north,east"
    zipcodes: List[str]
    timezone: str
    population: int
    area_km2: float
    num_zones: int = 20  # City-specific zone count (grid divisions)

# Pre-configured cities
CITIES = {
    "nyc": CityConfig(
        id="nyc",
        name="New York City",
        state="NY",
        country="USA",
        center_lat=40.7128,
        center_lon=-74.0060,
        bbox="40.4774,-74.2591,40.9176,-73.7004",
        zipcodes=["10001", "10002", "10003", "10004", "10005"],
        timezone="America/New_York",
        population=8336817,
        area_km2=783.8,
        num_zones=40,
    ),
    "chicago": CityConfig(
        id="chicago",
        name="Chicago",
        state="IL",
        country="USA",
        center_lat=41.8781,
        center_lon=-87.6298,
        bbox="41.6445,-87.9401,42.0231,-87.5240",
        zipcodes=["60601", "60602", "60603", "60604", "60605"],
        timezone="America/Chicago",
        population=2693976,
        area_km2=606.1,
        num_zones=25,
    ),
    "la": CityConfig(
        id="la",
        name="Los Angeles",
        state="CA",
        country="USA",
        center_lat=34.0522,
        center_lon=-118.2437,
        bbox="33.7037,-118.6682,34.3373,-118.1553",
        zipcodes=["90001", "90002", "90003", "90004", "90005"],
        timezone="America/Los_Angeles",
        population=3898747,
        area_km2=1302.0,
        num_zones=35,
    ),
    "sf": CityConfig(
        id="sf",
        name="San Francisco",
        state="CA",
        country="USA",
        center_lat=37.7749,
        center_lon=-122.4194,
        bbox="37.6398,-122.5149,37.9298,-122.2818",
        zipcodes=["94102", "94103", "94104", "94105", "94107"],
        timezone="America/Los_Angeles",
        population=873965,
        area_km2=121.4,
        num_zones=12,
    ),
    "houston": CityConfig(
        id="houston",
        name="Houston",
        state="TX",
        country="USA",
        center_lat=29.7604,
        center_lon=-95.3698,
        bbox="29.5371,-95.8098,29.9839,-95.0120",
        zipcodes=["77001", "77002", "77003", "77004", "77005"],
        timezone="America/Chicago",
        population=2320268,
        area_km2=1703.8,
        num_zones=25,
    ),
    "phoenix": CityConfig(
        id="phoenix",
        name="Phoenix",
        state="AZ",
        country="USA",
        center_lat=33.4484,
        center_lon=-112.0740,
        bbox="33.1980,-112.2380,33.6988,-111.9100",
        zipcodes=["85001", "85002", "85003", "85004", "85005"],
        timezone="America/Phoenix",
        population=1680992,
        area_km2=1340.6,
        num_zones=20,
    ),
}

class CityService:
    """Service for managing city configurations"""
    
    @staticmethod
    def get_city(city_id: str) -> Optional[CityConfig]:
        """Get city configuration by ID."""
        return CITIES.get(city_id.lower())
    
    @staticmethod
    def list_cities() -> List[Dict[str, any]]:
        """List all available cities."""
        return [
            {
                "id": city.id,
                "name": city.name,
                "state": city.state,
                "country": city.country,
                "population": city.population,
                "area_km2": city.area_km2,
                "num_zones": getattr(city, "num_zones", 20),
            }
            for city in CITIES.values()
        ]
    
    @staticmethod
    def get_city_311_endpoint(city_id: str) -> Optional[str]:
        """Get 311 API endpoint for a city."""
        endpoints = {
            "nyc": "https://data.cityofnewyork.us/resource/erm2-nwe9.json",
            "chicago": "https://data.cityofchicago.org/resource/v6vf-nfxy.json",
            "la": "https://data.lacity.org/resource/wjz9-h9np.json",
            "sf": "https://data.sfgov.org/resource/vw6y-z8j6.json"
        }
        return endpoints.get(city_id.lower())
    
    @staticmethod
    def reverse_geocode(lat: float, lon: float) -> str:
        """
        Reverse geocode coordinates to get neighborhood/suburb name.
        Uses OpenStreetMap Nominatim API (free, no key required).
        
        Args:
            lat: Latitude
            lon: Longitude
            
        Returns:
            Neighborhood/suburb name or fallback name
        """
        try:
            # Use Nominatim reverse geocoding
            url = "https://nominatim.openstreetmap.org/reverse"
            params = {
                "lat": lat,
                "lon": lon,
                "format": "json",
                "addressdetails": 1,
                "zoom": 16,  # Get neighborhood level detail
                "user-agent": "UrbanGridManagementSystem/1.0"
            }
            
            # Rate limiting: Nominatim requires max 1 request per second
            time.sleep(1.1)  # Be respectful to the API
            
            response = requests.get(url, params=params, timeout=5)
            if response.status_code == 200:
                data = response.json()
                address = data.get("address", {})
                
                # Try to get neighborhood/suburb/district name in order of preference
                name = (
                    address.get("neighbourhood") or
                    address.get("suburb") or
                    address.get("district") or
                    address.get("city_district") or
                    address.get("quarter") or
                    address.get("village") or
                    address.get("town") or
                    address.get("city") or
                    None
                )
                
                if name:
                    return name
                
                # Fallback: use display_name and extract first meaningful part
                display_name = data.get("display_name", "")
                if display_name:
                    parts = display_name.split(",")
                    if len(parts) > 0:
                        return parts[0].strip()
            
        except Exception as e:
            print(f"Reverse geocoding failed for ({lat}, {lon}): {e}")
        
        # Final fallback
        return None

    @staticmethod
    def calculate_zone_coordinates(city_id: str, num_zones: int = 20, use_reverse_geocode: bool = True) -> List[Dict[str, any]]:
        """
        Calculate zone coordinates for a city.
        Divides the city into a grid of zones and optionally reverse geocodes for real names.
        
        Args:
            city_id: City identifier
            num_zones: Number of zones to create
            use_reverse_geocode: Whether to fetch real neighborhood names via reverse geocoding
            
        Returns:
            List of zone coordinates with real neighborhood names
        """
        city = CITIES.get(city_id.lower())
        if not city:
            return []
        
        # Parse bounding box
        bbox_parts = city.bbox.split(",")
        south = float(bbox_parts[0])
        west = float(bbox_parts[1])
        north = float(bbox_parts[2])
        east = float(bbox_parts[3])
        
        # Calculate grid dimensions
        lat_range = north - south
        lon_range = east - west
        
        # Determine grid size (e.g., 4x5 for 20 zones)
        import math
        cols = math.ceil(math.sqrt(num_zones * (lon_range / lat_range)))
        rows = math.ceil(num_zones / cols)
        
        zones = []
        zone_idx = 0
        
        print(f"Calculating {num_zones} zones for {city_id}...")
        if use_reverse_geocode:
            print("Fetching real neighborhood names via reverse geocoding (this may take a moment)...")
        
        for row in range(rows):
            for col in range(cols):
                if zone_idx >= num_zones:
                    break
                
                # Calculate zone boundaries
                zone_south = south + (lat_range / rows) * row
                zone_north = south + (lat_range / rows) * (row + 1)
                zone_west = west + (lon_range / cols) * col
                zone_east = west + (lon_range / cols) * (col + 1)
                
                # Center point of zone
                zone_lat = (zone_south + zone_north) / 2
                zone_lon = (zone_west + zone_east) / 2
                
                # Get real neighborhood name via reverse geocoding
                zone_name = None
                if use_reverse_geocode:
                    zone_name = CityService.reverse_geocode(zone_lat, zone_lon)
                    if zone_name:
                        print(f"  Zone {zone_idx + 1}: {zone_name}")
                
                # Fallback to generic name if reverse geocoding failed
                if not zone_name:
                    zone_name = f"Zone {zone_idx + 1}"
                
                zones.append({
                    "zone_id": f"Z_{str(zone_idx + 1).zfill(3)}",
                    "city_id": city_id,
                    "name": zone_name,  # Real neighborhood name
                    "lat": zone_lat,
                    "lon": zone_lon,
                    "bbox": f"{zone_south},{zone_west},{zone_north},{zone_east}",
                    "grid_position": {"row": row, "col": col}
                })
                
                zone_idx += 1
            
            if zone_idx >= num_zones:
                break
        
        print(f"Successfully calculated {len(zones)} zones with real neighborhood names.")
        return zones
