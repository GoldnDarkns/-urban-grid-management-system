"""
City 311 Service - City-specific 311 API Integration
Fetches real service requests and incidents (varies by city)

NYC: Uses new NYC 311 Public API (api-portal.nyc.gov)
Other cities: Uses Socrata Open Data APIs
"""
import requests
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
import sys
import os as os_module
import os

sys.path.insert(0, os_module.path.dirname(os_module.path.dirname(os_module.path.dirname(os_module.path.abspath(__file__)))))

from src.db.mongo_client import get_db

class City311Service:
    """Service for fetching 311 service requests (city-specific)"""
    
    def __init__(self, city: str = "nyc"):
        self.city = city.lower()
        # NYC 311 Public API (new official API)
        # Other cities still use Socrata Open Data (may need updates)
        # NOTE:
        # - NYC Public API often requires an API key.
        # - We keep a Socrata fallback so the app works out-of-the-box without keys.
        self.nyc_public_url = "https://api.nyc.gov/public/api/GetServiceRequestList"
        self.nyc_socrata_url = "https://data.cityofnewyork.us/resource/erm2-nwe9.json"

        self.api_urls = {
            "nyc": self.nyc_public_url,  # New NYC 311 Public API (POST)
            "chicago": "https://data.cityofchicago.org/resource/v6vf-nfxy.json",
            "la": "https://data.lacity.org/resource/wjz9-h9np.json",
            "sf": "https://data.sfgov.org/resource/vw6y-z8j6.json"
        }
        # NYC 311 Public API requires POST for GetServiceRequestList
        self.nyc_api_base = "https://api.nyc.gov/public/api"
    
    def get_service_requests(self, limit: int = 100, status: str = "open") -> List[Dict[str, Any]]:
        """
        Get service requests from city 311 API.
        
        Args:
            limit: Number of requests to fetch
            status: Filter by status (open, closed, etc.)
            
        Returns:
            List of service requests
        """
        try:
            if self.city not in self.api_urls:
                print(f"311 API not configured for city: {self.city}")
                return []
            
            # NYC: prefer Public API (now has API key); fallback to Socrata on 401/403
            if self.city == "nyc":
                return self._get_nyc_311_requests(limit=limit, status=status)
            
            # Other cities use Socrata Open Data (GET request)
            url = self.api_urls[self.city]
            params = {
                "$limit": limit,
                "$order": "created_date DESC"
            }
            
            if status:
                params["status"] = status
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            return self._normalize_requests(data)
            
        except Exception as e:
            print(f"311 API error for {self.city}: {e}")
            import traceback
            traceback.print_exc()
            return []

    def _get_nyc_socrata_requests(self, limit: int = 100, status: str = "open") -> List[Dict[str, Any]]:
        """
        NYC fallback using Socrata Open Data endpoint (works without API key).
        """
        try:
            params = {
                "$limit": limit,
                "$order": "created_date DESC"
            }
            if status:
                params["status"] = status
            response = requests.get(self.nyc_socrata_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            return self._normalize_requests(data if isinstance(data, list) else [])
        except Exception as e:
            print(f"[City311Service] NYC Socrata fallback error: {e}")
            return []
    
    def _get_nyc_311_requests(self, limit: int = 100, status: str = "open") -> List[Dict[str, Any]]:
        """
        Get NYC 311 requests using the new Public API (POST /api/GetServiceRequestList/post).
        
        Args:
            limit: Number of requests to fetch
            status: Filter by status (open, closed, etc.)
            
        Returns:
            List of normalized service requests
        """
        try:
            # NYC 311 Public API - GetServiceRequestList requires SR numbers
            # Use a different approach: Try to get recent requests via a different endpoint
            # Or use the Socrata API which is more suitable for listing requests
            
            # Based on the error "List of SR numbers are required", GetServiceRequestList
            # is for fetching specific requests, not listing all. Use Socrata for listing.
            print(f"[City311Service] NYC Public API GetServiceRequestList requires SR numbers.")
            print(f"[City311Service] Falling back to Socrata API for listing requests...")
            return self._get_nyc_socrata_requests(limit=limit, status=status)
            
            # Original attempt (kept for reference):
            url = f"{self.nyc_api_base}/GetServiceRequestList"
            
            # Use provided API key (Primary key from api-portal.nyc.gov)
            api_key = os.getenv("NYC_311_API_KEY", "595b675e68554d359a9223fe8791c30c")
            
            # Try multiple header formats (NYC APIs vary)
            headers_variants = [
                {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Ocp-Apim-Subscription-Key": api_key
                },
                {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-API-Key": api_key
                },
                {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "apikey": api_key
                }
            ]
            
            # Try different payload formats
            payload_variants = [
                # Format 1: Simple limit
                {"limit": limit},
                # Format 2: With offset
                {"limit": limit, "offset": 0},
                # Format 3: With ordering
                {"limit": limit, "orderBy": "createdDate", "orderDirection": "DESC"},
                # Format 4: With status
                {"limit": limit, "status": status.upper() if status else "OPEN"},
            ]
            
            last_error = None
            for headers in headers_variants:
                for payload in payload_variants:
                    try:
                        response = requests.post(url, json=payload, headers=headers, timeout=15)
                        if response.status_code == 200:
                            # Success!
                            data = response.json()
                            # Handle different response formats
                            if isinstance(data, dict):
                                requests_data = data.get("data") or data.get("results") or data.get("serviceRequests") or data.get("items") or []
                            elif isinstance(data, list):
                                requests_data = data
                            else:
                                continue
                            
                            if requests_data:
                                return self._normalize_requests(requests_data)
                        elif response.status_code not in (400, 401, 403):
                            # If it's not a format/auth error, log it
                            print(f"[City311Service] NYC API returned {response.status_code}: {response.text[:200]}")
                    except requests.RequestException as e:
                        last_error = e
                        continue
            
            # If all POST attempts failed, try GET as fallback
            print(f"[City311Service] All POST attempts failed, trying GET...")
            get_headers = {
                "Accept": "application/json",
                "Ocp-Apim-Subscription-Key": api_key
            }
            params = {"limit": limit}
            if status:
                params["status"] = status.upper()
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict):
                    requests_data = data.get("data") or data.get("results") or data.get("serviceRequests") or data.get("items") or []
                elif isinstance(data, list):
                    requests_data = data
                else:
                    requests_data = []
                
                if requests_data:
                    return self._normalize_requests(requests_data)
            
            # If we get here, all attempts failed
            raise requests.HTTPError(f"All NYC 311 API attempts failed. Last status: {response.status_code if 'response' in locals() else 'N/A'}")
            
        except requests.HTTPError as e:
            # If the public API rejects us (401/403), fallback to Socrata so the system still runs.
            try:
                code = e.response.status_code if e.response is not None else None
            except Exception:
                code = None
            if code in (401, 403):
                print(f"[City311Service] NYC Public API auth error ({code}); falling back to Socrata.")
                return self._get_nyc_socrata_requests(limit=limit, status=status)
            print(f"[City311Service] NYC 311 Public API HTTP error: {e}")
            import traceback
            traceback.print_exc()
            return []
        except Exception as e:
            print(f"[City311Service] NYC 311 Public API error: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def _normalize_requests(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Normalize service requests from different city APIs to a common format.
        
        Args:
            data: Raw API response data
            
        Returns:
            List of normalized service requests
        """
        requests_list = []
        
        for req in data:
            # Normalize different city formats
            normalized = {
                "request_id": req.get("unique_key") or req.get("service_request_id") or req.get("id") or req.get("requestId"),
                "type": req.get("complaint_type") or req.get("service_name") or req.get("request_type") or req.get("type"),
                "description": req.get("descriptor") or req.get("description") or req.get("what") or req.get("details"),
                "status": req.get("status") or "unknown",
                "created_date": req.get("created_date") or req.get("requested_datetime") or req.get("createdDate") or req.get("created"),
                "location": {
                    "lat": req.get("latitude") or req.get("y") or (req.get("location", {}).get("latitude") if isinstance(req.get("location"), dict) else None),
                    "lon": req.get("longitude") or req.get("x") or (req.get("location", {}).get("longitude") if isinstance(req.get("location"), dict) else None),
                    "address": req.get("incident_address") or req.get("address") or req.get("location") or req.get("streetAddress")
                },
                "source": self.city
            }
            requests_list.append(normalized)
        
        return requests_list
    
    def get_311_requests(self, city_id: str = None, limit: int = 100, status: str = "open") -> List[Dict[str, Any]]:
        """
        Alias for get_service_requests (for compatibility with live_data routes).
        
        Args:
            city_id: City ID (optional, uses self.city if not provided)
            limit: Number of requests to fetch
            status: Filter by status
            
        Returns:
            List of service requests
        """
        if city_id:
            original_city = self.city
            self.city = city_id.lower()
            result = self.get_service_requests(limit=limit, status=status)
            self.city = original_city
            return result
        return self.get_service_requests(limit=limit, status=status)
    
    def get_power_outage_requests(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get power outage related service requests.
        
        Args:
            limit: Number of requests to fetch
            
        Returns:
            List of power outage requests
        """
        try:
            all_requests = self.get_service_requests(limit=limit * 2)
            
            # Filter for power/electrical related
            power_keywords = ["power", "electric", "outage", "blackout", "streetlight", "light"]
            power_requests = []
            
            for req in all_requests:
                req_type = (req.get("type") or "").lower()
                description = (req.get("description") or "").lower()
                
                if any(keyword in req_type or keyword in description for keyword in power_keywords):
                    power_requests.append(req)
                    if len(power_requests) >= limit:
                        break
            
            return power_requests
        except Exception as e:
            print(f"Error fetching power outage requests: {e}")
            return []
