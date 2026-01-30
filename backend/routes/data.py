"""
Data API routes - MongoDB data access endpoints.

Supports two modes:
- sim: simulated/demo dataset (Atlas)
- city: live city processing dataset (local/offline)
"""
from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional, List
from datetime import datetime, timedelta, timezone
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.db.mongo_client import get_db, ping
from pymongo.errors import ConnectionFailure

router = APIRouter()

def _get_mode(request: Request) -> str:
    mode = (request.headers.get("x-data-mode") or request.headers.get("X-Data-Mode") or "").strip().lower()
    return mode if mode in ("city", "sim") else "sim"


def safe_get_db():
    """Safely get database connection, return None if connection fails."""
    try:
        # Try to ping first to check connection
        if not ping("sim"):
            return None
        return get_db("sim")
    except Exception as e:
        # Catch all exceptions including ConnectionFailure
        print(f"Safe get_db failed: {e}")
        return None

def safe_get_db_mode(mode: str):
    """Safely get DB based on mode ('sim' or 'city')."""
    purpose = "city" if mode == "city" else "sim"
    try:
        if not ping(purpose):
            return None
        return get_db(purpose)
    except Exception as e:
        print(f"Safe get_db({purpose}) failed: {e}")
        return None


@router.get("/status")
async def get_database_status(request: Request, city_id: Optional[str] = Query(None)):
    """Get MongoDB connection status and database info. Uses short timeout so client does not see connection reset."""
    try:
        mode = _get_mode(request)
        purpose = "city" if mode == "city" else "sim"
        # Use 5s timeout so we respond quickly when MongoDB is unreachable (avoids ERR_CONNECTION_RESET from long wait)
        is_connected = ping(purpose, timeout_ms=5000)
        
        if not is_connected:
            return {
                "connected": False,
                "database": None,
                "collections": {},
                "error": "MongoDB connection failed. Please check your .env file and ensure MongoDB is running."
            }
        
        # Try to get database - catch any exceptions
        try:
            db = safe_get_db_mode(mode)
            if db is None:
                return {
                    "connected": False,
                    "database": None,
                    "collections": {},
                    "error": "MongoDB connection failed"
                }
        except Exception as db_error:
            error_msg = str(db_error)
            if "authentication" in error_msg.lower() or "bad auth" in error_msg.lower():
                return {
                    "connected": False,
                    "database": None,
                    "collections": {},
                    "error": "MongoDB authentication failed. Please verify your password (1234) in .env file."
                }
            return {
                "connected": False,
                "database": None,
                "collections": {},
                "error": f"Cannot access database: {error_msg}"
            }
        
        # Get collection stats with fast estimated counts
        collections = {}
        if mode == "city":
            collection_names = [
                "zones",
                "processed_zone_data",
                "city_processing_summary",
                "weather_data",
                "aqi_data",
                "traffic_data",
                "eia_electricity_data",
                "eia_co2_emissions",
                "alerts",
            ]
        else:
            collection_names = ["zones", "households", "policies", "grid_edges",
                              "meter_readings", "air_climate_readings",
                              "constraint_events", "alerts"]
        
        for coll_name in collection_names:
            try:
                coll = db[coll_name]
                # Use estimated_document_count() for large collections (much faster)
                # Fall back to count_documents() for small collections
                if coll_name in ["meter_readings", "air_climate_readings"]:
                    # Use estimated count for large time-series collections
                    count = coll.estimated_document_count()
                else:
                    # Use exact count for smaller collections
                    if mode == "city" and city_id and coll_name in [
                        "zones",
                        "processed_zone_data",
                        "city_processing_summary",
                        "weather_data",
                        "aqi_data",
                        "traffic_data",
                        "eia_electricity_data",
                        "eia_co2_emissions",
                        "alerts",
                    ]:
                        count = coll.count_documents({"city_id": city_id})
                    else:
                        count = coll.count_documents({})
                
                # Get indexes
                indexes = list(coll.index_information().keys())
                
                out = {"count": count, "indexes": indexes}
                # City mode: distinct zone count for processed_zone_data (unique zones, not doc count)
                if mode == "city" and city_id and coll_name == "processed_zone_data":
                    try:
                        distinct_zones = coll.distinct("zone_id", {"city_id": city_id})
                        out["distinct_zones"] = len(distinct_zones)
                    except Exception:
                        out["distinct_zones"] = None
                collections[coll_name] = out
            except Exception as e:
                collections[coll_name] = {
                    "count": 0,
                    "indexes": [],
                    "error": str(e)[:50]
                }
        
        return {
            "connected": True,
            "database": db.name,
            "mode": mode,
            "city_id": city_id,
            "collections": collections
        }
    except Exception as e:
        # Return error response instead of raising exception
        error_msg = str(e)
        if "authentication" in error_msg.lower() or "bad auth" in error_msg.lower():
            error_msg = "MongoDB authentication failed. Please check your password in .env file."
        elif "replica set" in error_msg.lower():
            error_msg = "MongoDB connection timeout. Please check your network connection and MongoDB Atlas settings."
        
        return {
            "connected": False,
            "database": None,
            "collections": {},
            "error": error_msg
        }


@router.get("/zones")
async def get_zones(request: Request, city_id: Optional[str] = Query(None)):
    """Get all zones with their details."""
    try:
        mode = _get_mode(request)
        db = safe_get_db_mode(mode)
        if db is None:
            return {"zones": [], "count": 0, "error": "MongoDB connection failed"}

        query = {}
        if mode == "city" and city_id:
            query["city_id"] = city_id
        zones = list(db.zones.find(query))
        
        # Convert ObjectId to string
        for zone in zones:
            zone["id"] = zone.pop("_id")
        
        return {"zones": zones, "count": len(zones)}
    except Exception as e:
        return {"zones": [], "count": 0, "error": str(e)}


@router.get("/zones/{zone_id}")
async def get_zone(request: Request, zone_id: str, city_id: Optional[str] = Query(None)):
    """Get a specific zone by ID."""
    try:
        mode = _get_mode(request)
        db = safe_get_db_mode(mode)
        if db is None:
            return {"error": "MongoDB connection failed"}
        
        query = {"_id": zone_id}
        if mode == "city" and city_id:
            query["city_id"] = city_id
        zone = db.zones.find_one(query)
        
        if not zone:
            return {"error": "Zone not found"}
        
        zone["id"] = zone.pop("_id")
        
        # Get zone metrics
        demand = list(db.meter_readings.aggregate([
            {"$match": {"zone_id": zone_id}},
            {"$group": {
                "_id": None,
                "total_kwh": {"$sum": "$kwh"},
                "avg_kwh": {"$avg": "$kwh"},
                "max_kwh": {"$max": "$kwh"},
                "count": {"$sum": 1}
            }}
        ]))
        
        aqi = list(db.air_climate_readings.aggregate([
            {"$match": {"zone_id": zone_id}},
            {"$group": {
                "_id": None,
                "avg_aqi": {"$avg": "$aqi"},
                "max_aqi": {"$max": "$aqi"},
                "avg_temp": {"$avg": "$temperature_c"}
            }}
        ]))
        
        zone["metrics"] = {
            "demand": demand[0] if demand else None,
            "aqi": aqi[0] if aqi else None
        }
        
        return zone
    except Exception as e:
        return {"error": str(e)}


@router.get("/households")
async def get_households(request: Request, limit: int = 50, zone_id: Optional[str] = None):
    """Get households with optional zone filter."""
    try:
        mode = _get_mode(request)
        if mode == "city":
            return {"households": [], "count": 0, "mode": "city", "message": "Households are available in SIM dataset only."}
        db = safe_get_db_mode(mode)
        if db is None:
            return {"households": [], "count": 0, "error": "MongoDB connection failed"}
        
        query = {}
        if zone_id:
            query["zone_id"] = zone_id
        
        households = list(db.households.find(query).limit(limit))
        
        for h in households:
            h["id"] = h.pop("_id")
        
        return {"households": households, "count": len(households)}
    except Exception as e:
        return {"households": [], "count": 0, "error": str(e)}


@router.get("/policies")
async def get_policies(request: Request):
    """Get all policies."""
    try:
        mode = _get_mode(request)
        if mode == "city":
            return {"policies": [], "count": 0, "mode": "city", "message": "Policies are available in SIM dataset only."}
        db = safe_get_db_mode(mode)
        if db is None:
            return {"policies": [], "count": 0, "error": "MongoDB connection failed"}
        policies = list(db.policies.find())
        
        for p in policies:
            p["id"] = p.pop("_id")
        
        return {"policies": policies, "count": len(policies)}
    except Exception as e:
        return {"policies": [], "count": 0, "error": str(e)}


@router.get("/grid-edges")
async def get_grid_edges(request: Request):
    """Get zone adjacency graph edges."""
    try:
        mode = _get_mode(request)
        if mode == "city":
            return {"edges": [], "adjacency": {}, "count": 0, "mode": "city", "message": "Grid graph is available in SIM dataset only."}
        db = safe_get_db_mode(mode)
        if db is None:
            return {"nodes": [], "edges": [], "error": "MongoDB connection failed"}
        edges = list(db.grid_edges.find({}, {"_id": 0}))
        
        # Build adjacency list
        adjacency = {}
        for edge in edges:
            from_zone = edge["from_zone"]
            to_zone = edge["to_zone"]
            
            if from_zone not in adjacency:
                adjacency[from_zone] = []
            adjacency[from_zone].append(to_zone)
        
        return {
            "edges": edges,
            "adjacency": adjacency,
            "count": len(edges)
        }
    except Exception as e:
        return {"edges": [], "adjacency": {}, "count": 0, "error": str(e)}


@router.get("/alerts")
async def get_alerts(request: Request, limit: int = 50, level: Optional[str] = None, city_id: Optional[str] = Query(None)):
    """Get alerts with optional level filter."""
    try:
        mode = _get_mode(request)
        db = safe_get_db_mode(mode)
        if db is None:
            return {"alerts": [], "count": 0, "error": "MongoDB connection failed"}
        
        query = {}
        if level:
            query["level"] = level
        if mode == "city" and city_id:
            query["city_id"] = city_id
        
        alerts = list(db.alerts.find(query).sort("ts", -1).limit(limit))
        
        for a in alerts:
            oid = a.pop("_id", None)
            a["id"] = str(oid) if oid is not None else None
            if "ts" in a:
                a["ts"] = a["ts"].isoformat()
            if "created_at" in a:
                a["created_at"] = a["created_at"].isoformat()
        
        return {"alerts": alerts, "count": len(alerts)}
    except Exception as e:
        return {"alerts": [], "count": 0, "error": str(e)}


@router.get("/constraint-events")
async def get_constraint_events(request: Request):
    """Get constraint events (lockdowns, advisories)."""
    try:
        mode = _get_mode(request)
        if mode == "city":
            return {"events": [], "count": 0, "mode": "city", "message": "Constraint events are available in SIM dataset only."}
        db = safe_get_db_mode(mode)
        if db is None:
            return {"events": [], "count": 0, "error": "MongoDB connection failed"}
        events = list(db.constraint_events.find().sort("start_ts", -1))
        
        for e in events:
            e["id"] = e.pop("_id")
            if "start_ts" in e:
                e["start_ts"] = e["start_ts"].isoformat()
            if "end_ts" in e:
                e["end_ts"] = e["end_ts"].isoformat()
            if "created_at" in e:
                e["created_at"] = e["created_at"].isoformat()
        
        return {"events": events, "count": len(events)}
    except Exception as e:
        return {"events": [], "count": 0, "error": str(e)}


@router.get("/meter-readings/sample")
async def get_meter_readings_sample(request: Request, limit: int = 100):
    """Get sample meter readings."""
    try:
        mode = _get_mode(request)
        if mode == "city":
            return {"readings": [], "count": 0, "mode": "city", "message": "Meter readings are available in SIM dataset only."}
        db = safe_get_db_mode(mode)
        if db is None:
            return {"readings": [], "count": 0, "error": "MongoDB connection failed"}
        readings = list(db.meter_readings.find().limit(limit))
        
        for r in readings:
            r.pop("_id", None)
            if "ts" in r:
                r["ts"] = r["ts"].isoformat()
        
        return {"readings": readings, "count": len(readings)}
    except Exception as e:
        return {"readings": [], "count": 0, "error": str(e)}


@router.get("/air-climate/sample")
async def get_air_climate_sample(request: Request, limit: int = 100):
    """Get sample air/climate readings."""
    try:
        mode = _get_mode(request)
        if mode == "city":
            return {"readings": [], "count": 0, "mode": "city", "message": "Air/climate readings are available in SIM dataset only."}
        db = safe_get_db_mode(mode)
        if db is None:
            return {"readings": [], "count": 0, "error": "MongoDB connection failed"}
        readings = list(db.air_climate_readings.find().limit(limit))
        
        for r in readings:
            r.pop("_id", None)
            if "ts" in r:
                r["ts"] = r["ts"].isoformat()
        
        return {"readings": readings, "count": len(readings)}
    except Exception as e:
        return {"readings": [], "count": 0, "error": str(e)}


# ==================== ADMIN CRUD ENDPOINTS ====================
# These endpoints allow full CRUD operations on MongoDB Atlas (Simulated mode only)

@router.get("/collection/{collection_name}/sample")
async def get_collection_sample(request: Request, collection_name: str, limit: int = Query(50, ge=1, le=200)):
    """Get sample documents from any collection (admin endpoint for Simulated mode)."""
    mode = _get_mode(request)
    if mode != "sim":
        return {"error": "Collection browsing is only available in Simulated mode", "documents": []}
    
    db = safe_get_db_mode("sim")
    if db is None:
        return {"error": "MongoDB connection failed", "documents": []}
    
    try:
        # Validate collection name to prevent injection
        allowed_collections = [
            "zones", "households", "policies", "grid_edges",
            "meter_readings", "air_climate_readings", "constraint_events", 
            "alerts", "mongodb_queries"
        ]
        if collection_name not in allowed_collections:
            return {"error": f"Collection '{collection_name}' not allowed", "documents": []}
        
        coll = db[collection_name]
        # Sort by _id descending (newest first) - ObjectIds contain timestamp
        # For time-series collections, also try sorting by 'ts' field
        try:
            if collection_name in ["meter_readings", "air_climate_readings", "alerts", "constraint_events"]:
                documents = list(coll.find().sort("ts", -1).limit(limit))
            elif collection_name == "mongodb_queries":
                documents = list(coll.find().sort("id", -1).limit(limit))
            else:
                documents = list(coll.find().sort("_id", -1).limit(limit))
        except Exception:
            # Fallback if sort fails
            documents = list(coll.find().limit(limit))
        
        # Convert ObjectId and datetime to strings
        for doc in documents:
            for key, value in list(doc.items()):
                if key == "_id":
                    doc["_id"] = str(value) if hasattr(value, '__str__') else value
                elif isinstance(value, datetime):
                    doc[key] = value.isoformat()
        
        return {"documents": documents, "count": len(documents), "collection": collection_name}
    except Exception as e:
        return {"error": str(e), "documents": []}


@router.post("/collection/{collection_name}/create")
async def create_document(request: Request, collection_name: str):
    """Create a new document in a collection (admin endpoint for Simulated mode)."""
    mode = _get_mode(request)
    if mode != "sim":
        return {"error": "Document creation is only available in Simulated mode"}
    
    db = safe_get_db_mode("sim")
    if db is None:
        return {"error": "MongoDB connection failed"}
    
    try:
        body = await request.json()
        
        # Validate collection name
        allowed_collections = [
            "zones", "households", "policies", "grid_edges",
            "meter_readings", "air_climate_readings", "constraint_events", 
            "alerts", "mongodb_queries"
        ]
        if collection_name not in allowed_collections:
            return {"error": f"Collection '{collection_name}' not allowed"}
        
        coll = db[collection_name]
        
        # Remove _id if provided (let MongoDB generate it)
        body.pop("_id", None)
        
        result = coll.insert_one(body)
        
        return {
            "success": True, 
            "inserted_id": str(result.inserted_id),
            "message": f"Document created in {collection_name}"
        }
    except Exception as e:
        return {"error": str(e)}


@router.put("/collection/{collection_name}/update/{doc_id}")
async def update_document(request: Request, collection_name: str, doc_id: str):
    """Update a document in a collection (admin endpoint for Simulated mode)."""
    mode = _get_mode(request)
    if mode != "sim":
        return {"error": "Document updates are only available in Simulated mode"}
    
    db = safe_get_db_mode("sim")
    if db is None:
        return {"error": "MongoDB connection failed"}
    
    try:
        body = await request.json()
        
        # Validate collection name
        allowed_collections = [
            "zones", "households", "policies", "grid_edges",
            "meter_readings", "air_climate_readings", "constraint_events", 
            "alerts", "mongodb_queries"
        ]
        if collection_name not in allowed_collections:
            return {"error": f"Collection '{collection_name}' not allowed"}
        
        coll = db[collection_name]
        
        # Remove _id from update body
        body.pop("_id", None)
        
        # Try to find by _id (could be string or ObjectId)
        from bson import ObjectId
        query = {"_id": doc_id}
        
        # Try ObjectId if it looks like one
        if len(doc_id) == 24:
            try:
                query = {"_id": ObjectId(doc_id)}
            except:
                pass
        
        result = coll.update_one(query, {"$set": body})
        
        if result.matched_count == 0:
            return {"error": f"Document {doc_id} not found in {collection_name}"}
        
        return {
            "success": True,
            "modified_count": result.modified_count,
            "message": f"Document updated in {collection_name}"
        }
    except Exception as e:
        return {"error": str(e)}


@router.delete("/collection/{collection_name}/delete/{doc_id}")
async def delete_document(request: Request, collection_name: str, doc_id: str):
    """Delete a document from a collection (admin endpoint for Simulated mode)."""
    mode = _get_mode(request)
    if mode != "sim":
        return {"error": "Document deletion is only available in Simulated mode"}
    
    db = safe_get_db_mode("sim")
    if db is None:
        return {"error": "MongoDB connection failed"}
    
    try:
        # Validate collection name
        allowed_collections = [
            "zones", "households", "policies", "grid_edges",
            "meter_readings", "air_climate_readings", "constraint_events", 
            "alerts", "mongodb_queries"
        ]
        if collection_name not in allowed_collections:
            return {"error": f"Collection '{collection_name}' not allowed"}
        
        coll = db[collection_name]
        
        # Try to find by _id (could be string or ObjectId)
        from bson import ObjectId
        query = {"_id": doc_id}
        
        # Try ObjectId if it looks like one
        if len(doc_id) == 24:
            try:
                query = {"_id": ObjectId(doc_id)}
            except:
                pass
        
        result = coll.delete_one(query)
        
        if result.deleted_count == 0:
            return {"error": f"Document {doc_id} not found in {collection_name}"}
        
        return {
            "success": True,
            "deleted_count": result.deleted_count,
            "message": f"Document deleted from {collection_name}"
        }
    except Exception as e:
        return {"error": str(e)}

