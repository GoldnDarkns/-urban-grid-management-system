"""
Population Service - Census API Integration
Fetches real population and demographic data (no API key needed for basic access)
"""
import requests
from typing import Dict, Any, Optional
from datetime import datetime
import sys
import os as os_module

sys.path.insert(0, os_module.path.dirname(os_module.path.dirname(os_module.path.dirname(os_module.path.abspath(__file__)))))

from src.db.mongo_client import get_db

class PopulationService:
    """Service for fetching population data from US Census Bureau"""
    
    def __init__(self):
        self.census_base_url = "https://api.census.gov/data"
        self.api_key = "2c01ca2f89d87654e36cfe6df1ae0a789673e973"
    
    def get_population_by_zipcode(self, zipcode: str, year: int = 2020) -> Optional[Dict[str, Any]]:
        """
        Get population data for a ZIP code.
        
        Args:
            zipcode: ZIP code
            year: Census year (default 2020)
            
        Returns:
            Dictionary with population data
        """
        try:
            # ACS 5-year estimates
            url = f"{self.census_base_url}/{year}/acs/acs5"
            params = {
                "get": "B01001_001E",  # Total population
                "for": f"zip code tabulation area:{zipcode}",
                "key": self.api_key
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if len(data) > 1:
                return {
                    "zipcode": zipcode,
                    "population": int(data[1][0]) if data[1][0] else 0,
                    "year": year,
                    "source": "US Census Bureau"
                }
            return None
        except Exception as e:
            print(f"Census API error: {e}")
            return None
    
    def get_demographics_by_zipcode(self, zipcode: str) -> Optional[Dict[str, Any]]:
        """
        Get demographic data for a ZIP code.
        
        Args:
            zipcode: ZIP code
            
        Returns:
            Dictionary with demographic data
        """
        try:
            # This is a simplified version - full implementation would fetch more variables
            url = f"{self.census_base_url}/2020/acs/acs5"
            params = {
                "get": "B01001_001E,B19013_001E",  # Population, Median Income
                "for": f"zip code tabulation area:{zipcode}",
                "key": self.api_key
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if len(data) > 1:
                return {
                    "zipcode": zipcode,
                    "population": int(data[1][0]) if data[1][0] else 0,
                    "median_income": int(data[1][1]) if len(data[1]) > 1 and data[1][1] else None,
                    "year": 2020,
                    "source": "US Census Bureau"
                }
            return None
        except Exception as e:
            print(f"Census demographics error: {e}")
            return None
