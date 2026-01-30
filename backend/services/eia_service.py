"""
EIA (Energy Information Administration) Service
Fetches real-time energy grid data, CO2 emissions, and international consumption data
"""
import requests
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
import sys
import os as os_module

sys.path.insert(0, os_module.path.dirname(os_module.path.dirname(os_module.path.dirname(os_module.path.abspath(__file__)))))

from src.db.mongo_client import get_db
from backend.services.eia_fallback import get_electricity_from_fallback, get_co2_from_fallback

# EIA API Base URL
EIA_BASE_URL = "https://api.eia.gov/v2"

# EIA API Key
# User provided API key from https://www.eia.gov/opendata/register.php
# Can be overridden with environment variable EIA_API_KEY
EIA_API_KEY = os_module.getenv("EIA_API_KEY", "MmSm5qrkIQRqbNM2k5jrRFWXaLTIkYVGFIzX0Cj3")

class EIAService:
    """Service for fetching energy data from EIA API"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or EIA_API_KEY
        self.base_url = EIA_BASE_URL
    
    def get_electricity_operational_data(
        self,
        state: Optional[str] = None,
        frequency: str = "monthly",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 100
    ) -> Optional[Dict[str, Any]]:
        """
        Get electricity operational data (generation, consumption, etc.).
        
        Args:
            state: State code (e.g., "CA", "NY") - optional
            frequency: "monthly" or "annual"
            start_date: Start date (YYYY-MM format for monthly, YYYY for annual)
            end_date: End date
            limit: Number of records to return (max 5000)
            
        Returns:
            Dictionary with electricity operational data
        """
        if not self.api_key:
            print("EIA API key not provided")
            return None
        
        try:
            url = f"{self.base_url}/electricity/electric-power-operational-data/data/"
            
            # Start with basic parameters
            params = {
                "api_key": self.api_key,
                "frequency": frequency,
                "length": min(limit, 5000),
                "offset": 0
            }
            
            # Add data columns - use simpler format that works
            # Note: We'll let the API return default columns if specific ones aren't available
            # The API will return available columns automatically
            
            # Add location filter if provided
            # Note: EIA electricity operational data uses 'location' facet, not 'stateid'
            # Location codes may differ from state codes - we'll try the state code first
            if state:
                # Try location facet (electricity operational data uses 'location', not 'stateid')
                params["facets[location][]"] = state
            
            # Add date range if provided
            if start_date:
                params["start"] = start_date
            if end_date:
                params["end"] = end_date
            
            # Add sort (optional, but helps with consistency)
            params["sort[0][column]"] = "period"
            params["sort[0][direction]"] = "desc"
            
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            if "response" in data and "data" in data["response"]:
                return {
                    "data": data["response"]["data"],
                    "total": data["response"].get("total", 0),
                    "frequency": frequency,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            return None
        except Exception as e:
            print(f"EIA Electricity API error: {e}")
            fallback = get_electricity_from_fallback(state, limit=limit) if state else None
            if fallback:
                print("[EIAService] Using annual_generation_state.xls fallback")
            return fallback
    
    def get_state_co2_emissions(
        self,
        state: Optional[str] = None,
        frequency: str = "annual",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 100
    ) -> Optional[Dict[str, Any]]:
        """
        Get state-level CO2 emissions data.
        Note: Uses /v2/seds/ route as recommended by EIA.
        
        Args:
            state: State code (e.g., "CA", "NY") - optional
            frequency: "annual" or "monthly"
            start_date: Start date
            end_date: End date
            limit: Number of records to return
            
        Returns:
            Dictionary with CO2 emissions data
        """
        if not self.api_key:
            print("EIA API key not provided")
            return None
        
        try:
            # Use SEDS route for state-level CO2 emissions (recommended by EIA)
            url = f"{self.base_url}/seds/data/"
            
            params = {
                "api_key": self.api_key,
                "frequency": frequency,
                "data[0]": "value",
                "sort[0][column]": "period",
                "sort[0][direction]": "desc",
                "length": min(limit, 5000),
                "offset": 0
            }
            
            # EIA SEDS: US-total series (EMISS.CO2-TOTV-TT-TO-US.A) cannot be filtered by stateid -> 400.
            # Use state-specific series when state provided (e.g. EMISS.CO2-TOTV-ST-NY.A); otherwise US total.
            # Do not add stateid facet; series ID already scoped.
            def _request(series_id: str):
                p = {**params, "facets[seriesId][]": series_id}
                if start_date:
                    p["start"] = start_date
                if end_date:
                    p["end"] = end_date
                r = requests.get(url, params=p, timeout=30)
                r.raise_for_status()
                return r.json()

            if state:
                st = (state or "").upper()[:2]
                series_id = f"EMISS.CO2-TOTV-ST-{st}.A"
                try:
                    data = _request(series_id)
                except requests.exceptions.HTTPError as err:
                    if err.response is not None and err.response.status_code == 400:
                        data = _request("EMISS.CO2-TOTV-TT-TO-US.A")
                    else:
                        raise
            else:
                data = _request("EMISS.CO2-TOTV-TT-TO-US.A")

            if "response" in data and "data" in data["response"]:
                return {
                    "data": data["response"]["data"],
                    "total": data["response"].get("total", 0),
                    "frequency": frequency,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            return None
        except Exception as e:
            print(f"EIA CO2 Emissions API error: {e}")
            fallback = get_co2_from_fallback(state, limit=limit) if state else None
            if fallback:
                print("[EIAService] Using emission_annual.xlsx fallback")
            return fallback
    
    def get_international_consumption(
        self,
        country: Optional[str] = None,
        product: Optional[str] = None,
        frequency: str = "monthly",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 100
    ) -> Optional[Dict[str, Any]]:
        """
        Get international country-level energy consumption data.
        
        Args:
            country: Country code (e.g., "USA", "CHN") - optional
            product: Product type (e.g., "petroleum", "natural-gas", "electricity") - optional
            frequency: "monthly" or "annual"
            start_date: Start date
            end_date: End date
            limit: Number of records to return
            
        Returns:
            Dictionary with international consumption data
        """
        if not self.api_key:
            print("EIA API key not provided")
            return None
        
        try:
            url = f"{self.base_url}/international/data/"
            
            params = {
                "api_key": self.api_key,
                "frequency": frequency,
                "data[0]": "value",
                "sort[0][column]": "period",
                "sort[0][direction]": "desc",
                "length": min(limit, 5000),
                "offset": 0
            }
            
            # Filter for consumption activity
            params["facets[activityId][]"] = "1"  # Consumption activity
            
            # Add country filter if provided
            if country:
                params["facets[countryRegionId][]"] = country
            
            # Add product filter if provided
            if product:
                # Map product names to product IDs
                product_map = {
                    "petroleum": "5",
                    "natural-gas": "6",
                    "electricity": "7",
                    "coal": "4"
                }
                if product.lower() in product_map:
                    params["facets[productId][]"] = product_map[product.lower()]
            
            # Add date range if provided
            if start_date:
                params["start"] = start_date
            if end_date:
                params["end"] = end_date
            
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            if "response" in data and "data" in data["response"]:
                return {
                    "data": data["response"]["data"],
                    "total": data["response"].get("total", 0),
                    "frequency": frequency,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            return None
        except Exception as e:
            print(f"EIA International API error: {e}")
            return None
    
    def get_retail_price(
        self,
        state: str,
        sector: str = "RES",
        frequency: str = "monthly",
        limit: int = 12,
    ) -> Optional[float]:
        """
        Get latest average retail electricity price (cents/kWh) for a state and sector.
        Uses EIA /v2/electricity/retail-sales with data[]=price.
        Sectors: RES (residential), COM (commercial), IND (industrial), ALL.
        Returns price in $/kWh (converted from cents).
        """
        if not self.api_key:
            return None
        try:
            url = f"{self.base_url}/electricity/retail-sales/data/"
            params = {
                "api_key": self.api_key,
                "data[0]": "price",
                "facets[stateid][]": state.upper() if state else None,
                "facets[sectorid][]": sector.upper() if sector else "RES",
                "frequency": frequency,
                "length": min(limit, 24),
                "sort[0][column]": "period",
                "sort[0][direction]": "desc",
            }
            params = {k: v for k, v in params.items() if v is not None}
            resp = requests.get(url, params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            rows = (data.get("response") or {}).get("data") or []
            if not rows:
                return None
            # Latest period; price is cents per kWh
            price_cents = rows[0].get("price")
            if price_cents is None:
                return None
            try:
                p = float(price_cents)
            except (TypeError, ValueError):
                return None
            return round(p / 100.0, 4)  # $/kWh
        except Exception as e:
            print(f"EIA retail price error: {e}")
            return None

    def store_electricity_data(self, zone_id: str, state: str) -> bool:
        """
        Fetch and store electricity operational data in MongoDB for a zone.
        
        Args:
            zone_id: Zone identifier
            state: State code
            
        Returns:
            True if successful
        """
        try:
            db = get_db()
            if db is None:
                return False
            
            # Get latest monthly data
            electricity_data = self.get_electricity_operational_data(
                state=state,
                frequency="monthly",
                limit=12  # Last 12 months
            )
            
            if not electricity_data or not electricity_data.get("data"):
                return False
            
            # Store in MongoDB
            for record in electricity_data["data"]:
                doc = {
                    "zone_id": zone_id,
                    "state": state,
                    "timestamp": datetime.now(timezone.utc),
                    "period": record.get("period"),
                    "generation": record.get("generation"),
                    "total_consumption": record.get("total-consumption"),
                    "cost": record.get("cost"),
                    "source": "eia"
                }
                db.eia_electricity_data.insert_one(doc)
            
            return True
        except Exception as e:
            print(f"Error storing EIA electricity data: {e}")
            return False
