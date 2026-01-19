"""
Data API routes - MongoDB data access endpoints.
"""
from fastapi import APIRouter, HTTPException
from typing import Optional, List
from datetime import datetime, timedelta, timezone
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.db.mongo_client import get_db, ping
from pymongo.errors import ConnectionFailure

router = APIRouter()


def safe_get_db():
    """Safely get database connection, return None if connection fails."""
    try:
        # Try to ping first to check connection
        if not ping():
            return None
        return get_db()
    except Exception as e:
        # Catch all exceptions including ConnectionFailure
        print(f"Safe get_db failed: {e}")
        return None


@router.get("/status")
async def get_database_status():
    """Get MongoDB connection status and database info."""
    try:
        # Use fast ping from connection pool
        is_connected = ping()
        
        if not is_connected:
            return {
                "connected": False,
                "database": None,
                "collections": {},
                "error": "MongoDB connection failed. Please check your .env file and ensure MongoDB is running."
            }
        
        # Try to get database - catch any exceptions
        try:
            db = safe_get_db()
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
                    count = coll.count_documents({})
                
                # Get indexes
                indexes = list(coll.index_information().keys())
                
                collections[coll_name] = {
                    "count": count,
                    "indexes": indexes
                }
            except Exception as e:
                collections[coll_name] = {
                    "count": 0,
                    "indexes": [],
                    "error": str(e)[:50]
                }
        
        return {
            "connected": True,
            "database": db.name,
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
async def get_zones():
    """Get all zones with their details."""
    try:
        db = safe_get_db()
        if db is None:
            return {"zones": [], "count": 0, "error": "MongoDB connection failed"}
        
        zones = list(db.zones.find())
        
        # Convert ObjectId to string
        for zone in zones:
            zone["id"] = zone.pop("_id")
        
        return {"zones": zones, "count": len(zones)}
    except Exception as e:
        return {"zones": [], "count": 0, "error": str(e)}


@router.get("/zones/{zone_id}")
async def get_zone(zone_id: str):
    """Get a specific zone by ID."""
    try:
        db = safe_get_db()
        if db is None:
            return {"error": "MongoDB connection failed"}
        
        zone = db.zones.find_one({"_id": zone_id})
        
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
async def get_households(limit: int = 50, zone_id: Optional[str] = None):
    """Get households with optional zone filter."""
    try:
        db = safe_get_db()
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
async def get_policies():
    """Get all policies."""
    try:
        db = safe_get_db()
        if db is None:
            return {"policies": [], "count": 0, "error": "MongoDB connection failed"}
        policies = list(db.policies.find())
        
        for p in policies:
            p["id"] = p.pop("_id")
        
        return {"policies": policies, "count": len(policies)}
    except Exception as e:
        return {"policies": [], "count": 0, "error": str(e)}


@router.get("/grid-edges")
async def get_grid_edges():
    """Get zone adjacency graph edges."""
    try:
        db = safe_get_db()
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
async def get_alerts(limit: int = 50, level: Optional[str] = None):
    """Get alerts with optional level filter."""
    try:
        db = safe_get_db()
        if db is None:
            return {"alerts": [], "count": 0, "error": "MongoDB connection failed"}
        
        query = {}
        if level:
            query["level"] = level
        
        alerts = list(db.alerts.find(query).sort("ts", -1).limit(limit))
        
        for a in alerts:
            a["id"] = a.pop("_id")
            if "ts" in a:
                a["ts"] = a["ts"].isoformat()
            if "created_at" in a:
                a["created_at"] = a["created_at"].isoformat()
        
        return {"alerts": alerts, "count": len(alerts)}
    except Exception as e:
        return {"alerts": [], "count": 0, "error": str(e)}


@router.get("/constraint-events")
async def get_constraint_events():
    """Get constraint events (lockdowns, advisories)."""
    try:
        db = safe_get_db()
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
async def get_meter_readings_sample(limit: int = 100):
    """Get sample meter readings."""
    try:
        db = safe_get_db()
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
async def get_air_climate_sample(limit: int = 100):
    """Get sample air/climate readings."""
    try:
        db = safe_get_db()
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

