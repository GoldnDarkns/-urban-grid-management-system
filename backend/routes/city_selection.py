"""
City Selection API Routes
"""
import asyncio
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, field_serializer, model_serializer
from bson import ObjectId
from pymongo.operations import UpdateOne
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.services.city_config import CityService, CityConfig
from backend.services.data_processor import DataProcessor
from backend.services.background_processor import start_background_processing, get_background_processor
from backend.services.cost_service import compute_costs
from src.db.mongo_client import get_city_db

router = APIRouter(prefix="/api/city", tags=["City Selection"])

# Pydantic models for response serialization
class ProcessedZoneResponse(BaseModel):
    """Response model for processed zone data with ObjectId handling"""
    zone_id: Optional[str] = None
    city_id: Optional[str] = None
    timestamp: Optional[str] = None
    raw_data: Dict[str, Any] = {}
    ml_processed: Dict[str, Any] = {}
    recommendations: List[str] = []
    _id: Optional[str] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]):
        """Create model from dict, ensuring all ObjectIds are converted"""
        # Deep copy and convert all ObjectIds
        cleaned_data = cls._clean_objectids(data)
        return cls(**cleaned_data)
    
    @staticmethod
    def _clean_objectids(obj):
        """Recursively clean ObjectIds from dict/list structures"""
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, dict):
            if '$oid' in obj:
                return str(obj['$oid'])
            return {k: ProcessedZoneResponse._clean_objectids(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [ProcessedZoneResponse._clean_objectids(item) for item in obj]
        if hasattr(obj, 'isoformat') and callable(getattr(obj, 'isoformat')):
            return obj.isoformat()
        return obj
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat() if hasattr(v, 'isoformat') else str(v)
        }

class ProcessedDataResponse(BaseModel):
    """Response model for processed data endpoint"""
    city_id: Optional[str] = None
    zones: List[ProcessedZoneResponse] = []
    count: int = 0
    total_unique_zones: int = 0
    timestamp: str = ""
    
    class Config:
        arbitrary_types_allowed = True

# Current selected city (in-memory, could be stored in DB)
_current_city: Optional[str] = None


@router.get("/list")
async def list_cities():
    """List all available cities."""
    cities = CityService.list_cities()
    return {"cities": cities, "count": len(cities)}

def _current_city_payload(city) -> dict:
    """Build the JSON payload for current city (same shape whether selected or not)."""
    if not city:
        return {
            "city_id": None,
            "name": None,
            "state": None,
            "country": None,
            "center_lat": None,
            "center_lon": None,
            "bbox": None,
            "population": None,
            "area_km2": None,
            "selected": False,
        }
    return {
        "city_id": city.id,
        "name": city.name,
        "state": city.state,
        "country": city.country,
        "center_lat": city.center_lat,
        "center_lon": city.center_lon,
        "bbox": city.bbox,
        "population": city.population,
        "area_km2": city.area_km2,
        "selected": True,
    }


@router.get("/current")
async def get_current_city():
    """Get currently selected city. Returns 200 with city_id/name etc. or nulls when none selected (no 404)."""
    global _current_city
    if not _current_city:
        return _current_city_payload(None)

    city = CityService.get_city(_current_city)
    return _current_city_payload(city)


@router.get("/costs")
async def get_city_costs(city_id: Optional[str] = Query(None, description="City ID (uses current if omitted)")):
    """Get energy and CO2 cost summary for a city from processed data + EIA retail price."""
    global _current_city
    if not city_id:
        city_id = _current_city
    if not city_id:
        raise HTTPException(status_code=400, detail="No city selected; provide city_id or select a city first")
    city_id = city_id.lower()
    costs = compute_costs(city_id)
    return {"city_id": city_id, **costs, "timestamp": datetime.now(timezone.utc).isoformat()}


def _select_response(success: bool, city_id: str, city_name: str, zones: list, message: str, error: str = None):
    """Always return 200 + JSON so CORS headers are sent; frontend checks success."""
    payload = {
        "success": success,
        "city_id": city_id,
        "name": city_name,
        "city_name": city_name,
        "zones_configured": len(zones) if zones else 0,
        "zones": zones or [],
        "message": message,
    }
    if error:
        payload["error"] = error
    return payload


@router.post("/select/{city_id}")
async def select_city(city_id: str):
    """Select a city and initialize zone coordinates. Always 200 + JSON (never 500) so CORS works."""
    global _current_city

    try:
        city = CityService.get_city(city_id)
        if not city:
            return _select_response(
                False, "", "", [], f"City '{city_id}' not found.",
                error=f"City '{city_id}' not found."
            )

        city_id = city_id.lower()
        num_zones = getattr(city, "num_zones", 20)
        # Skip reverse geocoding during select: N×1.1s/request causes 504. Use generic names.
        zones = CityService.calculate_zone_coordinates(city_id, num_zones=num_zones, use_reverse_geocode=False)

        # Set current city immediately so /current and other endpoints see it
        _current_city = city_id

        # Do zone DB write + start background processor in background so this request returns in <1s
        zones_snapshot = list(zones)
        city_name = city.name

        async def _after_select():
            try:
                db = get_city_db()
                if db is not None and zones_snapshot:
                    now = datetime.now(timezone.utc)
                    def _write_zones():
                        try:
                            ops = [
                                UpdateOne(
                                    {"_id": z["zone_id"]},
                                    {"$set": {
                                        "city_id": city_id,
                                        "location": {"lat": z["lat"], "lon": z["lon"], "bbox": z["bbox"]},
                                        "updated_at": now,
                                    }},
                                    upsert=True,
                                )
                                for z in zones_snapshot
                            ]
                            db.zones.bulk_write(ops, ordered=False)
                        except Exception as e:
                            print(f"Warning: Could not update zones in DB: {e}")
                    await asyncio.to_thread(_write_zones)
                processor = get_background_processor(city_id=city_id, interval_seconds=300)
                processor.update_city(city_id)
                if not processor.running:
                    await start_background_processing(city_id=city_id, interval_seconds=300)
            except Exception as e:
                print(f"Warning: Could not run post-select setup: {e}")

        asyncio.create_task(_after_select())

        return _select_response(
            True,
            city_id,
            city_name,
            zones,
            f"City '{city_name}' selected. {len(zones)} zones configured. Background processing started."
        )
    except Exception as e:
        print(f"select_city error: {e}")
        return _select_response(
            False,
            city_id,
            "",
            [],
            f"Failed to select city: {str(e)}",
            error=str(e)
        )

@router.post("/process/all")
async def process_all_zones(
    city_id: Optional[str] = Query(None, description="City ID (uses current if not provided)")
):
    """
    Process all zones for a city. Always 200 + JSON (never 500) so CORS works.
    """
    if not city_id:
        global _current_city
        city_id = _current_city or "nyc"
    
    # DB Health Check: Verify MongoDB is available BEFORE processing
    from src.db.mongo_client import ping, get_city_db
    db_available = ping("city")
    if not db_available:
        db = get_city_db()
        if db is None:
            return {
                "city_id": city_id,
                "summary": {"total_zones": 0, "successful": 0, "failed": 0},
                "zones_processed": [],
                "error": "MongoDB (CITY DB) is not available. Cannot save processed data. Please check MongoDB is running.",
                "db_status": "unavailable",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
    
    try:
        processor = DataProcessor(city_id=city_id)
        # Verify processor has DB connection
        if processor.db is None:
            return {
                "city_id": city_id,
                "summary": {"total_zones": 0, "successful": 0, "failed": 0},
                "zones_processed": [],
                "error": "MongoDB (CITY DB) connection failed. Cannot save processed data.",
                "db_status": "connection_failed",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        
        results = await processor.process_all_zones()
        # Add DB status to results
        results["db_status"] = "connected" if processor.db is not None else "disconnected"
        # Fire-and-forget: sync Knowledge Graph (Neo4j) from processed data
        try:
            kg = __import__("backend.services.neo4j_kg_service", fromlist=["get_kg_service"]).get_kg_service()
            if kg.available and processor.db:
                async def _sync_kg():
                    try:
                        cursor = processor.db.processed_zone_data.find({"city_id": city_id}).sort("timestamp", -1)
                        all_docs = list(cursor)
                        by_zone = {}
                        for z in all_docs:
                            zid = z.get("zone_id")
                            if zid and zid not in by_zone:
                                by_zone[zid] = z
                        zones = list(by_zone.values())
                        city_config = CityService.get_city(city_id)
                        coords_list = []
                        if city_config and zones:
                            try:
                                coords_list = CityService.calculate_zone_coordinates(city_id, city_config.num_zones, use_reverse_geocode=False)
                            except Exception:
                                pass
                        coords_by_id = {z.get("zone_id"): z for z in coords_list if z.get("zone_id")}
                        for z in zones:
                            c = coords_by_id.get(z.get("zone_id"))
                            if c:
                                if z.get("lat") is None:
                                    z["lat"] = c.get("lat")
                                if z.get("lon") is None:
                                    z["lon"] = c.get("lon")
                        grid_edges = None
                        if coords_list:
                            zone_by_pos = {}
                            for z in coords_list:
                                pos, zid = z.get("grid_position"), z.get("zone_id")
                                if pos is not None and zid:
                                    zone_by_pos[(pos.get("row"), pos.get("col"))] = zid
                            grid_edges = []
                            for (row, col), zid in zone_by_pos.items():
                                for dr, dc in [(0, 1), (1, 0)]:
                                    nb = zone_by_pos.get((row + dr, col + dc))
                                    if nb and nb != zid:
                                        grid_edges.append((zid, nb))
                        kg.sync_from_processed_zones(city_id, zones, edges=grid_edges)
                    except Exception:
                        pass
                asyncio.create_task(_sync_kg())
        except Exception:
            pass
        return results
    except Exception as e:
        print(f"process_all_zones error: {e}")
        return {
            "city_id": city_id,
            "summary": {"total_zones": 0, "successful": 0, "failed": 0},
            "zones_processed": [],
            "error": str(e),
            "db_status": "error",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

@router.post("/process/zone/{zone_id}")
async def process_single_zone(
    zone_id: str,
    lat: float = Query(..., description="Zone latitude"),
    lon: float = Query(..., description="Zone longitude"),
    city_id: Optional[str] = Query(None, description="City ID")
):
    """
    Process a single zone:
    - Fetch live API data
    - Process with ML models
    - Generate recommendations
    """
    if not city_id:
        global _current_city
        city_id = _current_city or "nyc"
    
    processor = DataProcessor(city_id=city_id)
    results = await processor.process_zone_data(zone_id, lat, lon)
    
    return results

@router.post("/process/eia")
async def process_eia_data(
    city_id: Optional[str] = Query(None, description="City ID")
):
    """Process EIA data for the city's state. Always 200 + JSON (never 500) so CORS works."""
    if not city_id:
        global _current_city
        city_id = _current_city or "nyc"
    try:
        city = CityService.get_city(city_id)
        if not city:
            return {"city_id": city_id, "error": "City not found", "electricity": None, "co2_emissions": None}
        processor = DataProcessor(city_id=city_id)
        results = await processor.process_eia_data(city.state)
        return results
    except Exception as e:
        print(f"process_eia_data error: {e}")
        return {
            "city_id": city_id,
            "error": str(e),
            "electricity": None,
            "co2_emissions": None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

@router.get("/zones/coordinates")
async def get_zone_coordinates(
    city_id: Optional[str] = Query(None, description="City ID")
):
    """Get zone coordinates for a city."""
    if not city_id:
        global _current_city
        city_id = _current_city
    if not city_id:
        return {"city_id": None, "zones": [], "count": 0}
    city = CityService.get_city(city_id)
    num_zones = getattr(city, "num_zones", 20) if city else 20
    zones = CityService.calculate_zone_coordinates(city_id, num_zones=num_zones, use_reverse_geocode=False)
    return {"city_id": city_id, "zones": zones, "count": len(zones)}

@router.get("/processing-summary")
async def get_processing_summary(
    city_id: Optional[str] = Query(None, description="City ID")
):
    """
    Get the latest processing summary for a city (zones, ML runs, timestamps).
    """
    if not city_id:
        global _current_city
        city_id = _current_city
    if not city_id:
        return {"city_id": None, "summary": None, "message": "No city selected"}
    db = get_city_db()
    if db is None:
        return {"city_id": city_id, "summary": None, "message": "Database not available"}
    try:
        doc = db.city_processing_summary.find_one(
            {"city_id": city_id},
            sort=[("timestamp", -1)]
        )
        if not doc:
            return {"city_id": city_id, "summary": None, "message": "No processing run found"}
        return {
            "city_id": city_id,
            "summary": {
                "total_zones": doc.get("summary", {}).get("total_zones", 0),
                "successful": doc.get("summary", {}).get("successful", 0),
                "failed": doc.get("summary", {}).get("failed", 0),
                "timestamp": doc.get("timestamp"),
                "city_name": doc.get("city_name"),
            },
            "zones_processed": doc.get("zones_processed", [])[:5],
        }
    except Exception as e:
        return {"city_id": city_id, "summary": None, "error": str(e)}


@router.get("/processed-data")
async def get_processed_data(
    city_id: Optional[str] = Query(None, description="City ID"),
    zone_id: Optional[str] = Query(None, description="Zone ID (optional)"),
    limit: int = Query(20, ge=1, le=100, description="Number of zones to return")
):
    """
    Get processed data for zones (raw API data + ML outputs + recommendations).
    This is the main endpoint for displaying dynamic data on the frontend.
    """
    import json
    from fastapi.responses import Response
    
    # Wrap entire function in try/except to catch ALL exceptions
    # CRITICAL: Convert everything to plain Python types before FastAPI sees it
    try:
        if not city_id:
            global _current_city
            city_id = _current_city
        if not city_id:
            return Response(
                content=json.dumps({
                    "city_id": None,
                    "zones": [],
                    "count": 0,
                    "total_unique_zones": 0,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }, default=str),
                media_type="application/json",
                headers={"Access-Control-Allow-Origin": "*"}
            )

        db = get_city_db()
        if db is None:
            return Response(
                content=json.dumps({
                    "city_id": str(city_id) if city_id else None,
                    "zones": [],
                    "count": 0,
                    "total_unique_zones": 0,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }, default=str),
                media_type="application/json",
                headers={"Access-Control-Allow-Origin": "*"}
            )
        
        print(f"[get_processed_data] Starting processing for city_id={city_id}")

    except Exception as outer_e:
        # Ensure this outer guard never prevents app startup (SyntaxError previously happened here)
        try:
            import traceback
            traceback.print_exc()
        except Exception:
            pass
        try:
            import json as _json
            error_payload = {
                "city_id": str(city_id) if city_id else None,
                "zones": [],
                "count": 0,
                "total_unique_zones": 0,
                "error": f"Unexpected error before query: {str(outer_e)}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            return Response(
                content=_json.dumps(error_payload, default=str),
                media_type="application/json",
                headers={"Access-Control-Allow-Origin": "*"},
            )
        except Exception:
            return Response(
                content='{"city_id":null,"zones":[],"count":0,"total_unique_zones":0,"error":"Unexpected error","timestamp":""}',
                media_type="application/json",
                headers={"Access-Control-Allow-Origin": "*"},
            )

    query = {"city_id": city_id}
    if zone_id:
        query["zone_id"] = zone_id
    
    # Get ALL processed data (no limit) to ensure we get all unique zones
    # Then group by zone_id and get latest for each zone
    from bson import ObjectId
    from bson.json_util import dumps, loads
    import json
    
    def convert_doc(doc):
        """Convert a MongoDB document to a plain dict with all ObjectIds converted"""
        if doc is None:
            return {}
        
        # Use bson.json_util.dumps to convert BSON to JSON string
        # Then parse with json.loads to get plain dict (ObjectIds become $oid dicts)
        # Then recursively convert $oid dicts to strings
        try:
            json_str = dumps(doc, default=str)
            # Parse JSON - this will have $oid, $date, etc. as dicts
            parsed = json.loads(json_str)
            # Recursively convert $oid dicts to strings
            def convert_oid(obj, depth=0):
                # Prevent infinite recursion
                if depth > 20:
                    return str(obj) if obj is not None else None
                if isinstance(obj, dict):
                    # Check for BSON special keys first
                    if '$oid' in obj:
                        return str(obj['$oid'])
                    elif '$date' in obj:
                        return obj['$date']  # Keep as ISO string
                    elif '$numberLong' in obj:
                        return int(obj['$numberLong'])
                    elif '$numberDecimal' in obj:
                        return float(obj['$numberDecimal'])
                    else:
                        # Recursively convert nested dicts
                        return {k: convert_oid(v, depth+1) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [convert_oid(item, depth+1) for item in obj]
                elif isinstance(obj, ObjectId):
                    # Direct ObjectId check (shouldn't happen after dumps, but just in case)
                    return str(obj)
                elif hasattr(obj, 'isoformat') and callable(getattr(obj, 'isoformat')):
                    # datetime-like objects
                    return obj.isoformat()
                else:
                    return obj
            return convert_oid(parsed)
        except Exception as e:
            print(f"[convert_doc] Error converting doc: {e}")
            # Fallback: manual conversion
            if not isinstance(doc, dict):
                try:
                    doc = dict(doc)
                except:
                    return {}
            
            result = {}
            for key, value in doc.items():
                try:
                    if value is None:
                        result[key] = None
                    elif isinstance(value, ObjectId):
                        result[key] = str(value)
                    elif isinstance(value, datetime):
                        result[key] = value.isoformat()
                    elif isinstance(value, dict):
                        result[key] = convert_doc(value)
                    elif isinstance(value, (list, tuple)):
                        result[key] = [convert_doc(item) if isinstance(item, dict) else (str(item) if isinstance(item, ObjectId) else (item.isoformat() if isinstance(item, datetime) else item)) for item in value]
                    elif hasattr(value, 'isoformat'):  # datetime-like
                        result[key] = value.isoformat()
                    else:
                        result[key] = value
                except Exception as e2:
                    print(f"[convert_doc] Error converting key {key}: {e2}")
                    result[key] = str(value) if value is not None else None
            return result
    
    try:
        # Fetch documents and convert _id to string in the query using projection
        # This prevents MongoDB from returning ObjectId for _id
        raw_data = list(
            db.processed_zone_data
            .find(query, {"_id": 0})  # Exclude _id entirely to avoid ObjectId issues
            .sort("timestamp", -1)
        )
        print(f"[get_processed_data] Found {len(raw_data)} documents for city_id={city_id} (without _id)")
        
        # Convert documents to plain dicts using bson.json_util for complete conversion
        from bson.json_util import dumps as bson_dumps
        import json as json_module
        
        processed_data = []
        for i, doc in enumerate(raw_data):
            try:
                # Use bson.json_util for complete conversion (handles all BSON types)
                json_str = bson_dumps(doc, default=str)
                parsed = json_module.loads(json_str)
                # Clean all $oid dicts
                cleaned = ProcessedZoneResponse._clean_objectids(parsed)
                processed_data.append(cleaned)
            except Exception as e:
                print(f"[get_processed_data] Error converting doc {i}: {e}")
                continue
            
    except Exception as e:
        print(f"[get_processed_data] Error querying database: {e}")
        import traceback
        traceback.print_exc()
        processed_data = []
    
    # Group by zone_id and get latest for each
    # CRITICAL: Ensure all items are dicts before grouping
    zone_map = {}
    print(f"[get_processed_data] Starting grouping of {len(processed_data)} processed items")
    for i, item in enumerate(processed_data):
        try:
            # Ensure item is a dict, not a MongoDB document
            if not isinstance(item, dict):
                print(f"[get_processed_data] Item {i} is not a dict: {type(item)}, converting...")
                item = convert_doc(item)
            
            # Always convert to ensure no ObjectIds (don't check, just convert)
            item = convert_doc(item)
            
            zid = item.get("zone_id")
            if not zid:
                continue
            
            # CRITICAL: Ensure item is fully cleaned before storing in zone_map
            # Use bson.json_util to ensure complete conversion
            from bson.json_util import dumps as bson_dumps
            import json as json_module
            try:
                json_str = bson_dumps(item, default=str)
                parsed = json_module.loads(json_str)
                item = ProcessedZoneResponse._clean_objectids(parsed)
            except:
                # Fallback to convert_doc
                item = convert_doc(item)
            
            # Compare timestamps safely (handle string and datetime)
            item_ts = item.get("timestamp")
            if zid not in zone_map:
                zone_map[zid] = item
            else:
                existing_ts = zone_map[zid].get("timestamp")
                # Convert to comparable format if needed
                try:
                    if isinstance(item_ts, str) and isinstance(existing_ts, str):
                        if item_ts > existing_ts:
                            zone_map[zid] = item
                    elif item_ts and existing_ts:
                        # If one is datetime and one is string, compare as strings
                        item_ts_str = item_ts.isoformat() if hasattr(item_ts, 'isoformat') else str(item_ts)
                        existing_ts_str = existing_ts.isoformat() if hasattr(existing_ts, 'isoformat') else str(existing_ts)
                        if item_ts_str > existing_ts_str:
                            zone_map[zid] = item
                except Exception as e:
                    print(f"[get_processed_data] Error comparing timestamps: {e}")
                    # If comparison fails, keep existing or use new based on zone_id order
                    if zid not in zone_map:
                        zone_map[zid] = item
        except Exception as e:
            print(f"[get_processed_data] Error processing item {i}: {e}")
            continue
    
    print(f"[get_processed_data] Grouped into {len(zone_map)} unique zones")
    print(f"[get_processed_data] About to create zones_list from zone_map")
    
    # Apply limit to final unique zones list
    # CRITICAL: Convert zone_map values to list and ensure they're all clean dicts
    try:
        print(f"[get_processed_data] Creating zones_list from {len(zone_map)} zones in zone_map")
        zones_list = []
        from bson.json_util import dumps as bson_dumps
        import json as json_module
        
        for zid, zone in zone_map.items():
            try:
                # Ensure zone is a dict
                if not isinstance(zone, dict):
                    print(f"[get_processed_data] Converting zone {zid} from {type(zone)} to dict")
                    zone = convert_doc(zone)
                
                # Use bson.json_util to ensure complete conversion
                json_str = bson_dumps(zone, default=str)
                parsed = json_module.loads(json_str)
                cleaned_zone = ProcessedZoneResponse._clean_objectids(parsed)
                zones_list.append(cleaned_zone)
            except Exception as e:
                print(f"[get_processed_data] Error processing zone {zid} for zones_list: {e}")
                continue
        
        if limit and len(zones_list) > limit:
            zones_list = zones_list[:limit]
        
        print(f"[get_processed_data] Created zones_list with {len(zones_list)} zones")
    except Exception as e:
        print(f"[get_processed_data] Error creating zones_list: {e}")
        import traceback
        traceback.print_exc()
        zones_list = []
    
    # CRITICAL: Ensure all zones are dicts and convert them (don't check for ObjectIds - just convert)
    for i, zone in enumerate(zones_list):
        if not isinstance(zone, dict):
            print(f"[get_processed_data] WARNING: Zone {i} is not a dict: {type(zone)}, converting...")
            zones_list[i] = convert_doc(zone) if zone else {}
        else:
            # Always convert to ensure no ObjectIds (don't check, just convert)
            zones_list[i] = convert_doc(zone)
    
    # Convert each zone one more time to be absolutely sure - and explicitly handle _id
    final_zones = []
    print(f"[get_processed_data] Starting final zone conversion for {len(zones_list)} zones")
    for i, zone in enumerate(zones_list):
        try:
            # Use bson.json_util for complete conversion
            from bson.json_util import dumps as bson_dumps
            import json as json_module
            
            # Ensure zone is a dict
            if not isinstance(zone, dict):
                print(f"[get_processed_data] Zone {i} is not a dict: {type(zone)}, converting...")
                zone = convert_doc(zone) if zone else {}
            
            # Convert using bson.json_util (handles all BSON types)
            try:
                json_str = bson_dumps(zone, default=str)
                parsed = json_module.loads(json_str)
                final_zone = ProcessedZoneResponse._clean_objectids(parsed)
            except Exception as bson_err:
                print(f"[get_processed_data] bson.json_util failed for zone {i}, using convert_doc: {bson_err}")
                final_zone = convert_doc(zone)
                final_zone = ProcessedZoneResponse._clean_objectids(final_zone)
            
            # Explicitly ensure _id is a string
            if '_id' in final_zone:
                final_zone['_id'] = str(final_zone['_id']) if final_zone['_id'] is not None else None
            
            final_zones.append(final_zone)
            if (i + 1) % 5 == 0:
                print(f"[get_processed_data] Converted {i + 1}/{len(zones_list)} zones")
        except Exception as e:
            print(f"[get_processed_data] Error converting zone {i}: {e}")
            import traceback
            traceback.print_exc()
            # Skip this zone if conversion fails
            continue
    
    print(f"[get_processed_data] Converted {len(final_zones)} zones successfully")
    print(f"[get_processed_data] About to create clean_zones from {len(final_zones)} zones")
    
    # Final pass: ensure all zones are completely clean (no ObjectIds anywhere)
    # Use bson.json_util for each zone, then build response
    try:
        print(f"[get_processed_data] Starting final clean_zones creation from {len(final_zones)} zones...")
        # One final conversion pass to ensure everything is clean
        clean_zones = []
        for zone in final_zones:
            # Convert one more time to be absolutely sure
            clean_zone = convert_doc(zone)
            # Use _clean_objectids as well
            clean_zone = ProcessedZoneResponse._clean_objectids(clean_zone)
            clean_zones.append(clean_zone)
        
        # Build response dict
        response_data = {
            "city_id": str(city_id) if city_id else None,
            "zones": clean_zones,
            "count": len(clean_zones),
            "total_unique_zones": len(zone_map),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # FastAPI's encoder now handles ObjectIds, so we can return dict directly
        # But to be safe, still pre-serialize
        def json_default(obj):
            """Custom JSON encoder for any remaining non-serializable types"""
            if isinstance(obj, ObjectId):
                return str(obj)
            if hasattr(obj, 'isoformat'):
                return obj.isoformat()
            return str(obj)
        
        # Use bson.json_util for final serialization to ensure 100% clean
        from bson.json_util import dumps as bson_dumps
        import json as json_module
        
        # Convert to JSON using bson.json_util, then clean $oid dicts
        json_str = bson_dumps(response_data, default=str)
        parsed = json_module.loads(json_str)
        final_cleaned = ProcessedZoneResponse._clean_objectids(parsed)
        response_json = json.dumps(final_cleaned, default=str, ensure_ascii=False)
        
        print(f"[get_processed_data] Returning response with {len(clean_zones)} zones ({len(response_json)} chars)")
        
        # Use Response with pre-encoded JSON
        return Response(
            content=response_json,
            media_type="application/json",
            headers={"Access-Control-Allow-Origin": "*"}
        )
    except Exception as e:
        print(f"[get_processed_data] Error creating response: {e}")
        import traceback
        traceback.print_exc()
        # Return minimal response
        error_response = {
            "city_id": str(city_id) if city_id else None,
            "zones": [],
            "count": 0,
            "total_unique_zones": len(zone_map),
            "error": f"Error: {str(e)}",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        return Response(
            content=json.dumps(error_response, default=str),
            media_type="application/json",
            headers={"Access-Control-Allow-Origin": "*"}
        )
    except Exception as outer_e:
        # Catch ANY exception that wasn't caught above
        print(f"[get_processed_data] OUTER EXCEPTION: {outer_e}")
        import traceback
        traceback.print_exc()
        # Return safe error response
        return Response(
            content=json.dumps({
                "city_id": str(city_id) if city_id else None,
                "zones": [],
                "count": 0,
                "total_unique_zones": 0,
                "error": f"Unexpected error: {str(outer_e)}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }, default=str),
            media_type="application/json",
            headers={"Access-Control-Allow-Origin": "*"}
        )
