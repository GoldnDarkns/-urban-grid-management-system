"""
MongoDB Queries API routes - Execute the 10 meaningful MongoDB queries.
"""
from fastapi import APIRouter, HTTPException, Query, Request, Body
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.db.mongo_client import get_db, ping
from backend.routes.data import safe_get_db, safe_get_db_mode, _get_mode
from pymongo.errors import ConnectionFailure


class QueryCreate(BaseModel):
    name: str
    description: str
    type: str  # "basic" or "advanced"
    collection: str
    code: Optional[str] = None  # Optional MongoDB query code


class QueryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    collection: Optional[str] = None

router = APIRouter(prefix="/api/queries", tags=["Queries"])


def get_default_queries():
    """Return default queries list including READ (1-10) and CRUD (11-15) operations."""
    return [
        # READ QUERIES (1-10)
        {
            "id": 1,
            "name": "Zones with Hospitals",
            "description": "List all zones that contain hospitals",
            "type": "basic",
            "collection": "zones",
            "operation": "read"
        },
        {
            "id": 2,
            "name": "Top Zones by Priority",
            "description": "List top N zones by grid priority",
            "type": "basic",
            "collection": "zones",
            "operation": "read"
        },
        {
            "id": 3,
            "name": "Zone Adjacency",
            "description": "Show adjacency list for a given zone",
            "type": "basic",
            "collection": "grid_edges",
            "operation": "read"
        },
        {
            "id": 4,
            "name": "Hourly Demand by Zone",
            "description": "Aggregate hourly energy demand for a specific zone",
            "type": "advanced",
            "collection": "meter_readings",
            "operation": "read"
        },
        {
            "id": 5,
            "name": "AQI Threshold Violations",
            "description": "Find zones that exceeded AQI policy thresholds",
            "type": "advanced",
            "collection": "air_climate_readings",
            "operation": "read"
        },
        {
            "id": 6,
            "name": "Consumption Anomalies",
            "description": "Find households with consumption anomalies",
            "type": "advanced",
            "collection": "meter_readings",
            "operation": "read"
        },
        {
            "id": 7,
            "name": "Active Constraint Events",
            "description": "Find currently active or recent constraint events",
            "type": "advanced",
            "collection": "constraint_events",
            "operation": "read"
        },
        {
            "id": 8,
            "name": "Zone Risk Factors",
            "description": "Calculate risk factors for each zone",
            "type": "advanced",
            "collection": "zones",
            "operation": "read"
        },
        {
            "id": 9,
            "name": "Demand vs Temperature",
            "description": "Analyze correlation between temperature and energy demand",
            "type": "advanced",
            "collection": "meter_readings",
            "operation": "read"
        },
        {
            "id": 10,
            "name": "Critical Infrastructure Status",
            "description": "Comprehensive status report for critical infrastructure zones",
            "type": "advanced",
            "collection": "zones",
            "operation": "read"
        },
        # CRUD QUERIES (11-15) - Create, Update, Delete operations
        {
            "id": 11,
            "name": "INSERT Meter Reading",
            "description": "Add a new electricity/energy meter reading to the database",
            "type": "crud",
            "collection": "meter_readings",
            "operation": "insert"
        },
        {
            "id": 12,
            "name": "UPDATE Meter Reading",
            "description": "Update an existing meter reading (change kWh value)",
            "type": "crud",
            "collection": "meter_readings",
            "operation": "update"
        },
        {
            "id": 13,
            "name": "INSERT AQI Reading",
            "description": "Add a new Air Quality Index reading to the database",
            "type": "crud",
            "collection": "air_climate_readings",
            "operation": "insert"
        },
        {
            "id": 14,
            "name": "UPDATE AQI Reading",
            "description": "Update an existing AQI reading (change AQI value or temperature)",
            "type": "crud",
            "collection": "air_climate_readings",
            "operation": "update"
        },
        {
            "id": 15,
            "name": "DELETE Old Readings",
            "description": "Delete meter or AQI readings older than specified hours",
            "type": "crud",
            "collection": "meter_readings",
            "operation": "delete"
        }
    ]


@router.get("/list")
async def list_all_queries(request: Request):
    """List all available MongoDB queries from database or defaults."""
    mode = _get_mode(request)
    db = safe_get_db_mode(mode)
    if db is None:
        return {"queries": get_default_queries(), "total": 10, "error": "Database not available, using defaults"}
    
    try:
        # Try to get queries from MongoDB (only in SIM mode)
        if mode == "sim":
            # Always start with default queries (1-15)
            default_queries = get_default_queries()
            default_ids = {q["id"] for q in default_queries}
            
            # Get user-created queries from MongoDB (id > 15)
            stored_queries = list(db.mongodb_queries.find({"id": {"$gt": 15}}).sort("id", 1))
            
            # Merge: defaults + user-created
            all_queries = list(default_queries)
            for q in stored_queries:
                q_dict = dict(q)
                q_dict.pop("_id", None)
                # Ensure operation field exists
                if "operation" not in q_dict:
                    q_dict["operation"] = "read"
                all_queries.append(q_dict)
            
            return {
                "queries": all_queries, 
                "total": len(all_queries), 
                "source": "merged",
                "default_count": len(default_queries),
                "user_count": len(stored_queries)
            }
        else:
            # City mode: return defaults only (no editing in City mode)
            return {"queries": get_default_queries(), "total": 15, "source": "defaults", "readonly": True}
    except Exception as e:
        # Fallback to defaults on error
        return {"queries": get_default_queries(), "total": 15, "error": str(e), "source": "defaults"}


@router.post("/create")
async def create_query(request: Request, query_data: QueryCreate = Body(...)):
    """Create a new MongoDB query (admin only - for simulated dataset)."""
    mode = _get_mode(request)
    if mode != "sim":
        return {"error": "Query editing is only available in Simulated mode"}
    
    db = safe_get_db_mode("sim")
    if db is None:
        return {"error": "Database connection failed"}
    
    try:
        # Get next ID - check both mongodb_queries collection and default queries
        max_id_doc = db.mongodb_queries.find_one(sort=[("id", -1)])
        max_id_from_db = max_id_doc["id"] if max_id_doc else 0
        # Default queries go up to 15 (CRUD queries), so start from max of DB or 15
        next_id = max(max_id_from_db, 15) + 1
        
        # Generate default query code based on collection and description
        default_code = f"""// Query {next_id}: {query_data.name}
// {query_data.description}
db.{query_data.collection}.find({{}})
  .sort({{ "_id": -1 }})
  .limit(20)

// Collection: {query_data.collection}
// Type: {query_data.type}"""
        
        new_query = {
            "id": next_id,
            "name": query_data.name,
            "description": query_data.description,
            "type": query_data.type,
            "collection": query_data.collection,
            "operation": "read",  # User-created queries are read-only by default
            "code": query_data.code or default_code,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        db.mongodb_queries.insert_one(new_query)
        new_query.pop("_id", None)
        return {"success": True, "query": new_query}
    except Exception as e:
        return {"error": str(e)}


@router.put("/update/{query_id}")
async def update_query(request: Request, query_id: int, query_data: QueryUpdate = Body(...)):
    """Update an existing MongoDB query (admin only - for simulated dataset)."""
    mode = _get_mode(request)
    if mode != "sim":
        return {"error": "Query editing is only available in Simulated mode"}
    
    db = safe_get_db_mode("sim")
    if db is None:
        return {"error": "Database connection failed"}
    
    try:
        update_data = {}
        if query_data.name is not None:
            update_data["name"] = query_data.name
        if query_data.description is not None:
            update_data["description"] = query_data.description
        if query_data.type is not None:
            update_data["type"] = query_data.type
        if query_data.collection is not None:
            update_data["collection"] = query_data.collection
        
        result = db.mongodb_queries.update_one(
            {"id": query_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            return {"error": f"Query {query_id} not found"}
        
        updated = db.mongodb_queries.find_one({"id": query_id})
        updated.pop("_id", None)
        return {"success": True, "query": updated}
    except Exception as e:
        return {"error": str(e)}


@router.delete("/delete/{query_id}")
async def delete_query(request: Request, query_id: int):
    """Delete a MongoDB query (admin only - for simulated dataset)."""
    mode = _get_mode(request)
    if mode != "sim":
        return {"error": "Query editing is only available in Simulated mode"}
    
    db = safe_get_db_mode("sim")
    if db is None:
        return {"error": "Database connection failed"}
    
    try:
        # Don't allow deleting default queries (1-10)
        if query_id <= 10:
            return {"error": "Cannot delete default queries (ID 1-10)"}
        
        result = db.mongodb_queries.delete_one({"id": query_id})
        if result.deleted_count == 0:
            return {"error": f"Query {query_id} not found"}
        
        return {"success": True, "message": f"Query {query_id} deleted"}
    except Exception as e:
        return {"error": str(e)}


@router.get("/execute/{query_id}")
async def execute_query(
    request: Request,
    query_id: int,
    zone_id: Optional[str] = None,
    limit: int = Query(10, ge=1, le=100),
    hours: int = Query(24, ge=1, le=168),
    city_id: Optional[str] = Query(None)
):
    """Execute a specific MongoDB query."""
    mode = _get_mode(request)
    db = safe_get_db_mode(mode)
    if db is None:
        return {"error": "MongoDB connection failed", "results": []}
    
    # In City mode, use city_id from query param or try to get current city
    if mode == "city" and not city_id:
        try:
            from backend.routes.city_selection import get_current_city_id
            city_id = get_current_city_id()
        except:
            pass
    
    try:
        if query_id == 1:
            # Query 1: Zones with hospitals
            if mode == "city" and city_id:
                # CITY MODE: Use processed_zone_data
                query = {"city_id": city_id, "critical_sites": {"$in": ["hospital"]}}
                processed_zones = list(db.processed_zone_data.find(query).limit(limit))
                results = []
                for zone in processed_zones:
                    results.append({
                        "zone_id": zone.get("zone_id"),
                        "name": zone.get("zone_id", "").replace("_", " ").upper(),
                        "priority": zone.get("grid_priority", 1),
                        "critical_sites": zone.get("critical_sites", [])
                    })
            else:
                # SIM MODE: Use zones collection
                zones = list(db.zones.find({"critical_sites": "hospital"}).limit(limit))
                results = []
                for zone in zones:
                    results.append({
                        "zone_id": zone.get("_id"),
                        "name": zone.get("name"),
                        "priority": zone.get("grid_priority"),
                        "critical_sites": zone.get("critical_sites", [])
                    })
            return {"query_id": 1, "name": "Zones with Hospitals", "results": results, "count": len(results)}
        
        elif query_id == 2:
            # Query 2: Top zones by priority
            if mode == "city" and city_id:
                # CITY MODE: Use processed_zone_data
                query = {"city_id": city_id}
                processed_zones = list(db.processed_zone_data.find(query).sort("grid_priority", -1).limit(limit * 10))
                # Get unique zones (latest per zone_id)
                zone_map = {}
                for zone in processed_zones:
                    zone_id = zone.get("zone_id")
                    if zone_id not in zone_map:
                        zone_map[zone_id] = zone
                
                results = []
                for zone_id, zone in sorted(zone_map.items(), key=lambda x: x[1].get("grid_priority", 0), reverse=True)[:limit]:
                    results.append({
                        "zone_id": zone_id,
                        "name": zone_id.replace("_", " ").upper(),
                        "priority": zone.get("grid_priority", 1),
                        "population": zone.get("population_est", 0)
                    })
            else:
                # SIM MODE: Use zones collection
                zones = list(db.zones.find().sort("grid_priority", -1).limit(limit))
                results = []
                for zone in zones:
                    results.append({
                        "zone_id": zone.get("_id"),
                        "name": zone.get("name"),
                        "priority": zone.get("grid_priority"),
                        "population": zone.get("population_est", 0)
                    })
            return {"query_id": 2, "name": "Top Zones by Priority", "results": results, "count": len(results)}
        
        elif query_id == 3:
            # Query 3: Zone adjacency
            if not zone_id:
                zone_id = "Z_001"
            
            if mode == "city" and city_id:
                # CITY MODE: Use processed_zone_data and calculate proximity-based neighbors
                query = {"city_id": city_id, "zone_id": zone_id}
                zone = db.processed_zone_data.find_one(query, sort=[("timestamp", -1)])
                if not zone:
                    return {"error": f"Zone {zone_id} not found for city {city_id}", "results": []}
                
                # Get all zones for this city to calculate neighbors
                all_zones = list(db.processed_zone_data.find({"city_id": city_id}).sort("timestamp", -1).limit(1000))
                zone_map = {}
                for z in all_zones:
                    zid = z.get("zone_id")
                    if zid not in zone_map:
                        zone_map[zid] = z
                
                # Find neighbors based on proximity (zones within 0.05 degrees)
                target_zone = zone_map.get(zone_id)
                if not target_zone:
                    return {"error": f"Zone {zone_id} not found", "results": []}
                
                target_lat = target_zone.get("lat") or target_zone.get("coordinates", {}).get("lat", 0)
                target_lon = target_zone.get("lon") or target_zone.get("coordinates", {}).get("lon", 0)
                
                neighbors = []
                for zid, z in zone_map.items():
                    if zid == zone_id:
                        continue
                    z_lat = z.get("lat") or z.get("coordinates", {}).get("lat", 0)
                    z_lon = z.get("lon") or z.get("coordinates", {}).get("lon", 0)
                    dist = ((z_lat - target_lat) ** 2 + (z_lon - target_lon) ** 2) ** 0.5
                    if dist < 0.05:  # ~5km
                        neighbors.append({
                            "zone_id": zid,
                            "name": zid.replace("_", " ").upper(),
                            "priority": z.get("grid_priority", 1)
                        })
                
                results = {
                    "zone_id": zone_id,
                    "zone_name": zone_id.replace("_", " ").upper(),
                    "priority": target_zone.get("grid_priority", 1),
                    "neighbors": neighbors
                }
            else:
                # SIM MODE: Use zones and grid_edges
                zone = db.zones.find_one({"_id": zone_id})
                if not zone:
                    return {"error": f"Zone {zone_id} not found", "results": []}
                
                neighbors_edges = list(db.grid_edges.find({"from_zone": zone_id}))
                neighbor_ids = [n["to_zone"] for n in neighbors_edges]
                neighbor_zones = list(db.zones.find({"_id": {"$in": neighbor_ids}}))
                
                results = {
                    "zone_id": zone_id,
                    "zone_name": zone.get("name"),
                    "priority": zone.get("grid_priority"),
                    "neighbors": [
                        {
                            "zone_id": nz.get("_id"),
                            "name": nz.get("name"),
                            "priority": nz.get("grid_priority")
                        }
                        for nz in neighbor_zones
                    ]
                }
            return {"query_id": 3, "name": "Zone Adjacency", "results": results, "count": len(results.get("neighbors", []))}
        
        elif query_id == 4:
            # Query 4: Hourly demand by zone
            if not zone_id:
                zone_id = "Z_001"
            
            if mode == "city" and city_id:
                # CITY MODE: Use processed_zone_data demand forecasts
                cutoff = datetime.utcnow() - timedelta(hours=hours)
                query = {"city_id": city_id, "zone_id": zone_id, "timestamp": {"$gte": cutoff}}
                processed_zones = list(db.processed_zone_data.find(query).sort("timestamp", -1).limit(limit * 24))
                
                # Group by hour
                hourly_map = {}
                for zone in processed_zones:
                    ts = zone.get("timestamp")
                    if isinstance(ts, datetime):
                        hour_key = f"{ts.month}/{ts.day} {ts.hour}:00"
                        forecast = zone.get("ml_processed", {}).get("demand_forecast", {})
                        kwh = forecast.get("next_hour_kwh", 0)
                        if hour_key not in hourly_map:
                            hourly_map[hour_key] = {"total_kwh": 0, "count": 0}
                        hourly_map[hour_key]["total_kwh"] += kwh
                        hourly_map[hour_key]["count"] += 1
                
                formatted_results = []
                for hour_key, data in sorted(hourly_map.items())[:limit]:
                    formatted_results.append({
                        "datetime": hour_key,
                        "total_kwh": round(data["total_kwh"], 2),
                        "avg_kwh": round(data["total_kwh"] / max(data["count"], 1), 3),
                        "reading_count": data["count"]
                    })
            else:
                # SIM MODE: Use meter_readings
                cutoff = datetime.utcnow() - timedelta(hours=hours)
                pipeline = [
                    {"$match": {"zone_id": zone_id, "ts": {"$gte": cutoff}}},
                    {"$group": {
                        "_id": {
                            "year": {"$year": "$ts"},
                            "month": {"$month": "$ts"},
                            "day": {"$dayOfMonth": "$ts"},
                            "hour": {"$hour": "$ts"}
                        },
                        "total_kwh": {"$sum": "$kwh"},
                        "avg_kwh": {"$avg": "$kwh"},
                        "reading_count": {"$sum": 1}
                    }},
                    {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1}},
                    {"$limit": limit}
                ]
                results = list(db.meter_readings.aggregate(pipeline))
                formatted_results = []
                for r in results:
                    formatted_results.append({
                        "datetime": f"{r['_id']['month']}/{r['_id']['day']} {r['_id']['hour']}:00",
                        "total_kwh": round(r['total_kwh'], 2),
                        "avg_kwh": round(r['avg_kwh'], 3),
                        "reading_count": r['reading_count']
                    })
            return {"query_id": 4, "name": "Hourly Demand by Zone", "zone_id": zone_id, "results": formatted_results, "count": len(formatted_results)}
        
        elif query_id == 5:
            # Query 5: AQI threshold violations
            watch_threshold = 101  # Default AQI watch threshold
            
            if mode == "city" and city_id:
                # CITY MODE: Use processed_zone_data raw_data.aqi
                query = {"city_id": city_id}
                processed_zones = list(db.processed_zone_data.find(query).limit(1000))
                
                violations = {}
                for zone in processed_zones:
                    aqi_data = zone.get("raw_data", {}).get("aqi", {})
                    aqi = aqi_data.get("aqi", 0)
                    if aqi >= watch_threshold:
                        zone_id = zone.get("zone_id")
                        if zone_id not in violations:
                            violations[zone_id] = {"count": 0, "max_aqi": 0, "aqis": []}
                        violations[zone_id]["count"] += 1
                        violations[zone_id]["max_aqi"] = max(violations[zone_id]["max_aqi"], aqi)
                        violations[zone_id]["aqis"].append(aqi)
                
                formatted_results = []
                for zone_id, data in sorted(violations.items(), key=lambda x: x[1]["count"], reverse=True)[:limit]:
                    formatted_results.append({
                        "zone_id": zone_id,
                        "violation_count": data["count"],
                        "max_aqi": round(data["max_aqi"], 1),
                        "avg_aqi": round(sum(data["aqis"]) / len(data["aqis"]), 1)
                    })
            else:
                # SIM MODE: Use air_climate_readings
                policy = db.policies.find_one({"_id": "POL_AQI_CONTROL_V1"})
                if policy:
                    for t in policy.get("aqi_thresholds", []):
                        if t["level"] == "watch":
                            watch_threshold = t["min"]
                            break
                
                pipeline = [
                    {"$match": {"aqi": {"$gte": watch_threshold}}},
                    {"$group": {
                        "_id": "$zone_id",
                        "violation_count": {"$sum": 1},
                        "max_aqi": {"$max": "$aqi"},
                        "avg_aqi": {"$avg": "$aqi"}
                    }},
                    {"$sort": {"violation_count": -1}},
                    {"$limit": limit}
                ]
                results = list(db.air_climate_readings.aggregate(pipeline))
                formatted_results = []
                for r in results:
                    formatted_results.append({
                        "zone_id": r["_id"],
                        "violation_count": r["violation_count"],
                        "max_aqi": round(r["max_aqi"], 1),
                        "avg_aqi": round(r["avg_aqi"], 1)
                    })
            return {"query_id": 5, "name": "AQI Threshold Violations", "threshold": watch_threshold, "results": formatted_results, "count": len(formatted_results)}
        
        elif query_id == 6:
            # Query 6: Consumption anomalies
            if mode == "city" and city_id:
                # CITY MODE: Use processed_zone_data anomaly_detection
                query = {"city_id": city_id}
                processed_zones = list(db.processed_zone_data.find(query).sort("timestamp", -1).limit(1000))
                
                anomalies = []
                for zone in processed_zones:
                    anomaly = zone.get("ml_processed", {}).get("anomaly_detection", {})
                    if anomaly.get("is_anomaly"):
                        anomalies.append({
                            "zone_id": zone.get("zone_id"),
                            "timestamp": zone.get("timestamp").isoformat() if isinstance(zone.get("timestamp"), datetime) else str(zone.get("timestamp")),
                            "kwh": round(anomaly.get("current_demand", 0), 2),
                            "baseline_hourly": round(anomaly.get("threshold", 0), 3),
                            "anomaly_score": round(anomaly.get("anomaly_score", 0), 3),
                            "multiplier": round(anomaly.get("current_demand", 0) / max(anomaly.get("threshold", 1), 0.1), 1)
                        })
                
                anomalies.sort(key=lambda x: x.get("anomaly_score", 0), reverse=True)
            else:
                # SIM MODE: Use meter_readings
                households = {h["_id"]: h for h in db.households.find()}
                recent_readings = list(db.meter_readings.find().sort("ts", -1).limit(5000))
                
                anomalies = []
                for reading in recent_readings:
                    household = households.get(reading["household_id"])
                    if household:
                        hourly_baseline = household.get("baseline_kwh_daily", 15) / 24
                        if reading["kwh"] > hourly_baseline * 2.0:
                            anomalies.append({
                                "household_id": reading["household_id"],
                                "zone_id": reading["zone_id"],
                                "timestamp": reading["ts"].isoformat() if isinstance(reading["ts"], datetime) else str(reading["ts"]),
                                "kwh": round(reading["kwh"], 2),
                                "baseline_hourly": round(hourly_baseline, 3),
                                "multiplier": round(reading["kwh"] / hourly_baseline, 1)
                            })
                
                anomalies.sort(key=lambda x: x["multiplier"], reverse=True)
            return {"query_id": 6, "name": "Consumption Anomalies", "results": anomalies[:limit], "count": len(anomalies)}
        
        elif query_id == 7:
            # Query 7: Active constraint events
            # Note: Constraint events may not exist in City mode, return empty or generate from recommendations
            if mode == "city" and city_id:
                # CITY MODE: Generate constraint events from high-priority recommendations
                query = {"city_id": city_id}
                processed_zones = list(db.processed_zone_data.find(query).sort("timestamp", -1).limit(100))
                
                formatted_results = []
                for zone in processed_zones:
                    recommendations = zone.get("recommendations", [])
                    high_priority = [r for r in recommendations if r.get("priority") in ["high", "critical"]]
                    for rec in high_priority[:2]:  # Max 2 per zone
                        formatted_results.append({
                            "event_id": f"{zone.get('zone_id')}_{rec.get('action_type', 'unknown')}",
                            "type": rec.get("action_type", "constraint"),
                            "severity": rec.get("priority", "medium"),
                            "reason": rec.get("description", "High priority recommendation"),
                            "status": "ACTIVE",
                            "start_ts": zone.get("timestamp").isoformat() if isinstance(zone.get("timestamp"), datetime) else str(zone.get("timestamp")),
                            "end_ts": (datetime.utcnow() + timedelta(hours=24)).isoformat()
                        })
                        if len(formatted_results) >= limit:
                            break
                    if len(formatted_results) >= limit:
                        break
            else:
                # SIM MODE: Use constraint_events collection
                now = datetime.utcnow()
                week_ago = now - timedelta(days=7)
                
                events = list(db.constraint_events.find({
                    "$or": [
                        {"end_ts": {"$gte": now}},
                        {"start_ts": {"$gte": week_ago}}
                    ]
                }).sort("start_ts", -1).limit(limit))
                
                formatted_results = []
                for e in events:
                    status = "ACTIVE" if e["end_ts"] >= now else "ENDED"
                    formatted_results.append({
                        "event_id": e.get("_id"),
                        "type": e.get("type"),
                        "severity": e.get("severity"),
                        "reason": e.get("reason"),
                        "status": status,
                        "start_ts": e["start_ts"].isoformat() if isinstance(e["start_ts"], datetime) else str(e["start_ts"]),
                        "end_ts": e["end_ts"].isoformat() if isinstance(e["end_ts"], datetime) else str(e["end_ts"])
                    })
            return {"query_id": 7, "name": "Active Constraint Events", "results": formatted_results, "count": len(formatted_results)}
        
        elif query_id == 8:
            # Query 8: Zone risk factors
            if mode == "city" and city_id:
                # CITY MODE: Use processed_zone_data ml_processed.risk_score
                query = {"city_id": city_id}
                processed_zones = list(db.processed_zone_data.find(query).sort("timestamp", -1).limit(1000))
                
                # Get latest record per zone
                zone_map = {}
                for zone in processed_zones:
                    zone_id = zone.get("zone_id")
                    if zone_id not in zone_map:
                        zone_map[zone_id] = zone
                
                risk_scores = []
                for zone_id, zone in zone_map.items():
                    ml = zone.get("ml_processed", {})
                    risk = ml.get("risk_score", {})
                    raw = zone.get("raw_data", {})
                    aqi_data = raw.get("aqi", {})
                    forecast = ml.get("demand_forecast", {})
                    
                    risk_scores.append({
                        "zone_id": zone_id,
                        "zone_name": zone_id.replace("_", " ").upper(),
                        "risk_score": risk.get("score", 0),
                        "risk_level": risk.get("level", "low"),
                        "grid_priority": zone.get("grid_priority", 1),
                        "critical_sites": zone.get("critical_sites", []),
                        "avg_aqi": round(aqi_data.get("aqi", 0), 1) if aqi_data else None,
                        "max_demand_kwh": round(forecast.get("next_hour_kwh", 0), 2) if forecast else None
                    })
            else:
                # SIM MODE: Use original logic
                zones = list(db.zones.find())
                cutoff = datetime.utcnow() - timedelta(hours=24)
                risk_scores = []
                
                for zone in zones:
                    zone_id = zone["_id"]
                    
                    # Get recent demand
                    demand_pipeline = [
                        {"$match": {"zone_id": zone_id, "ts": {"$gte": cutoff}}},
                        {"$group": {
                            "_id": None,
                            "total_kwh": {"$sum": "$kwh"},
                            "avg_kwh": {"$avg": "$kwh"},
                            "max_kwh": {"$max": "$kwh"}
                        }}
                    ]
                    demand = list(db.meter_readings.aggregate(demand_pipeline))
                    
                    # Get recent AQI
                    aqi_pipeline = [
                        {"$match": {"zone_id": zone_id, "ts": {"$gte": cutoff}}},
                        {"$group": {
                            "_id": None,
                            "avg_aqi": {"$avg": "$aqi"},
                            "max_aqi": {"$max": "$aqi"}
                        }}
                    ]
                    aqi = list(db.air_climate_readings.aggregate(aqi_pipeline))
                    
                    # Calculate risk score
                    risk_score = 0
                    risk_score += zone.get("grid_priority", 1) * 10
                    if zone.get("critical_sites"):
                        risk_score += len(zone["critical_sites"]) * 15
                    if aqi and aqi[0].get("avg_aqi"):
                        avg_aqi = aqi[0]["avg_aqi"]
                        if avg_aqi > 150:
                            risk_score += 30
                        elif avg_aqi > 100:
                            risk_score += 15
                    if demand and demand[0].get("max_kwh"):
                        if demand[0]["max_kwh"] > 2:
                            risk_score += 20
                    
                    risk_scores.append({
                        "zone_id": zone_id,
                        "zone_name": zone["name"],
                        "risk_score": risk_score,
                        "grid_priority": zone.get("grid_priority", 1),
                        "critical_sites": zone.get("critical_sites", []),
                        "avg_aqi": round(aqi[0]["avg_aqi"], 1) if aqi and aqi[0].get("avg_aqi") else None,
                        "max_demand_kwh": round(demand[0]["max_kwh"], 2) if demand and demand[0].get("max_kwh") else None
                    })
            
            risk_scores.sort(key=lambda x: x["risk_score"], reverse=True)
            return {"query_id": 8, "name": "Zone Risk Factors", "results": risk_scores[:limit], "count": len(risk_scores)}
        
        elif query_id == 9:
            # Query 9: Demand vs temperature
            if mode == "city" and city_id:
                # CITY MODE: Use processed_zone_data
                cutoff = datetime.utcnow() - timedelta(hours=hours)
                query = {"city_id": city_id, "timestamp": {"$gte": cutoff}}
                processed_zones = list(db.processed_zone_data.find(query).sort("timestamp", -1).limit(limit * 24))
                
                # Group by hour
                hourly_data = {}
                for zone in processed_zones:
                    ts = zone.get("timestamp")
                    if isinstance(ts, datetime):
                        hour_key = (ts.day, ts.hour)
                        if hour_key not in hourly_data:
                            hourly_data[hour_key] = {"demand": 0, "temps": []}
                        forecast = zone.get("ml_processed", {}).get("demand_forecast", {})
                        hourly_data[hour_key]["demand"] += forecast.get("next_hour_kwh", 0)
                        weather = zone.get("raw_data", {}).get("weather", {})
                        temp = weather.get("temp") or weather.get("temperature")
                        if temp:
                            hourly_data[hour_key]["temps"].append(temp)
                
                results = []
                for (day, hour), data in sorted(hourly_data.items())[:limit]:
                    avg_temp = sum(data["temps"]) / len(data["temps"]) if data["temps"] else None
                    results.append({
                        "datetime": f"Day {day} {hour:02d}:00",
                        "demand_kwh": round(data["demand"], 2),
                        "temperature_c": round(avg_temp, 1) if avg_temp else None
                    })
            else:
                # SIM MODE: Use meter_readings and air_climate_readings
                cutoff = datetime.utcnow() - timedelta(days=3)
                
                demand_pipeline = [
                    {"$match": {"ts": {"$gte": cutoff}}},
                    {"$group": {
                        "_id": {
                            "day": {"$dayOfMonth": "$ts"},
                            "hour": {"$hour": "$ts"}
                        },
                        "total_kwh": {"$sum": "$kwh"}
                    }},
                    {"$sort": {"_id.day": 1, "_id.hour": 1}},
                    {"$limit": limit}
                ]
                demand_data = list(db.meter_readings.aggregate(demand_pipeline))
                
                temp_pipeline = [
                    {"$match": {"ts": {"$gte": cutoff}}},
                    {"$group": {
                        "_id": {
                            "day": {"$dayOfMonth": "$ts"},
                            "hour": {"$hour": "$ts"}
                        },
                        "avg_temp": {"$avg": "$temperature_c"}
                    }},
                    {"$sort": {"_id.day": 1, "_id.hour": 1}},
                    {"$limit": limit}
                ]
                temp_data = list(db.air_climate_readings.aggregate(temp_pipeline))
                
                temp_dict = {(t["_id"]["day"], t["_id"]["hour"]): t["avg_temp"] for t in temp_data}
                
                results = []
                for d in demand_data:
                    key = (d["_id"]["day"], d["_id"]["hour"])
                    temp = temp_dict.get(key)
                    results.append({
                        "datetime": f"Day {d['_id']['day']} {d['_id']['hour']:02d}:00",
                        "demand_kwh": round(d["total_kwh"], 2),
                        "temperature_c": round(temp, 1) if temp else None
                    })
            
            return {"query_id": 9, "name": "Demand vs Temperature", "results": results, "count": len(results)}
        
        elif query_id == 10:
            # Query 10: Critical infrastructure status
            if mode == "city" and city_id:
                # CITY MODE: Use processed_zone_data
                query = {"city_id": city_id, "critical_sites": {"$exists": True, "$ne": []}}
                processed_zones = list(db.processed_zone_data.find(query).sort("timestamp", -1).limit(1000))
                
                # Get latest record per zone
                zone_map = {}
                for zone in processed_zones:
                    zone_id = zone.get("zone_id")
                    if zone_id not in zone_map and zone.get("critical_sites"):
                        zone_map[zone_id] = zone
                
                results = []
                for zone_id, zone in list(zone_map.items())[:limit]:
                    ml = zone.get("ml_processed", {})
                    raw = zone.get("raw_data", {})
                    aqi_data = raw.get("aqi", {})
                    weather = raw.get("weather", {})
                    forecast = ml.get("demand_forecast", {})
                    recommendations = zone.get("recommendations", [])
                    high_priority_recs = [r for r in recommendations if r.get("priority") in ["high", "critical"]]
                    
                    results.append({
                        "zone_id": zone_id,
                        "zone_name": zone_id.replace("_", " ").upper(),
                        "critical_sites": zone.get("critical_sites", []),
                        "grid_priority": zone.get("grid_priority", 1),
                        "latest_aqi": round(aqi_data.get("aqi", 0), 1) if aqi_data else None,
                        "latest_temp": round(weather.get("temp") or weather.get("temperature", 0), 1) if weather else None,
                        "demand_24h_kwh": round(forecast.get("next_hour_kwh", 0), 2) if forecast else None,
                        "recent_alerts": len(high_priority_recs),
                        "alert_details": [
                            {
                                "level": rec.get("priority", "medium"),
                                "type": rec.get("action_type", "unknown"),
                                "aqi_value": aqi_data.get("aqi") if aqi_data else None
                            }
                            for rec in high_priority_recs[:2]
                        ]
                    })
            else:
                # SIM MODE: Use zones collection
                critical_zones = list(db.zones.find({"critical_sites": {"$exists": True, "$ne": []}}))
                cutoff = datetime.utcnow() - timedelta(hours=24)
                
                results = []
                for zone in critical_zones[:limit]:
                    zone_id = zone["_id"]
                    
                    alerts = list(db.alerts.find({
                        "zone_id": zone_id,
                        "ts": {"$gte": cutoff}
                    }).sort("ts", -1).limit(5))
                    
                    latest_aqi = db.air_climate_readings.find_one(
                        {"zone_id": zone_id},
                        sort=[("ts", -1)]
                    )
                    
                    demand_summary = list(db.meter_readings.aggregate([
                        {"$match": {"zone_id": zone_id, "ts": {"$gte": cutoff}}},
                        {"$group": {
                            "_id": None,
                            "total_kwh": {"$sum": "$kwh"},
                            "avg_kwh": {"$avg": "$kwh"}
                        }}
                    ]))
                    
                    results.append({
                        "zone_id": zone_id,
                        "zone_name": zone["name"],
                        "critical_sites": zone.get("critical_sites", []),
                        "grid_priority": zone.get("grid_priority", 1),
                        "latest_aqi": latest_aqi["aqi"] if latest_aqi else None,
                        "latest_temp": round(latest_aqi["temperature_c"], 1) if latest_aqi and latest_aqi.get("temperature_c") else None,
                        "demand_24h_kwh": round(demand_summary[0]["total_kwh"], 2) if demand_summary else None,
                        "recent_alerts": len(alerts),
                        "alert_details": [
                            {
                                "level": a.get("level"),
                                "type": a.get("type"),
                                "aqi_value": a.get("aqi_value")
                            }
                            for a in alerts[:2]
                        ]
                    })
            
            return {"query_id": 10, "name": "Critical Infrastructure Status", "results": results, "count": len(results)}
        
        # ==================== CRUD QUERIES (11-15) ====================
        # These queries modify data in MongoDB Atlas
        
        elif query_id == 11:
            # Query 11: INSERT Meter Reading
            # This is handled by POST endpoint below
            return {
                "query_id": 11, 
                "name": "INSERT Meter Reading",
                "message": "Use POST /api/queries/execute/11 with JSON body to insert",
                "example_body": {
                    "zone_id": "Z_001",
                    "household_id": "H_001",
                    "kwh": 1.5,
                    "ts": "2024-01-15T10:00:00Z"
                },
                "results": []
            }
        
        elif query_id == 12:
            # Query 12: UPDATE Meter Reading
            return {
                "query_id": 12,
                "name": "UPDATE Meter Reading", 
                "message": "Use POST /api/queries/execute/12 with JSON body to update",
                "example_body": {
                    "zone_id": "Z_001",
                    "household_id": "H_001",
                    "new_kwh": 2.5
                },
                "results": []
            }
        
        elif query_id == 13:
            # Query 13: INSERT AQI Reading
            return {
                "query_id": 13,
                "name": "INSERT AQI Reading",
                "message": "Use POST /api/queries/execute/13 with JSON body to insert",
                "example_body": {
                    "zone_id": "Z_001",
                    "aqi": 85,
                    "temperature_c": 25.5,
                    "humidity": 60,
                    "ts": "2024-01-15T10:00:00Z"
                },
                "results": []
            }
        
        elif query_id == 14:
            # Query 14: UPDATE AQI Reading
            return {
                "query_id": 14,
                "name": "UPDATE AQI Reading",
                "message": "Use POST /api/queries/execute/14 with JSON body to update",
                "example_body": {
                    "zone_id": "Z_001",
                    "new_aqi": 120,
                    "new_temperature_c": 28.0
                },
                "results": []
            }
        
        elif query_id == 15:
            # Query 15: DELETE Old Readings
            return {
                "query_id": 15,
                "name": "DELETE Old Readings",
                "message": "Use POST /api/queries/execute/15 with JSON body to delete",
                "example_body": {
                    "collection": "meter_readings",
                    "hours_old": 168,
                    "zone_id": "Z_001"
                },
                "results": []
            }
        
        else:
            return {"error": f"Query {query_id} not found", "results": []}
    
    except Exception as e:
        return {"error": str(e), "results": []}


@router.post("/execute/{query_id}")
async def execute_crud_query(
    request: Request,
    query_id: int,
    body: Dict[str, Any] = Body(...)
):
    """Execute a CRUD query (INSERT, UPDATE, DELETE) - queries 11-15."""
    mode = _get_mode(request)
    if mode != "sim":
        return {"error": "CRUD operations are only available in Simulated mode", "results": []}
    
    db = safe_get_db_mode("sim")
    if db is None:
        return {"error": "MongoDB connection failed", "results": []}
    
    try:
        if query_id == 11:
            # INSERT Meter Reading
            zone_id = body.get("zone_id", "Z_001")
            household_id = body.get("household_id", "H_001")
            kwh = body.get("kwh", 1.0)
            ts_str = body.get("ts")
            
            if ts_str:
                try:
                    ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                except:
                    ts = datetime.now(timezone.utc)
            else:
                ts = datetime.now(timezone.utc)
            
            new_reading = {
                "zone_id": zone_id,
                "household_id": household_id,
                "kwh": float(kwh),
                "ts": ts
            }
            
            result = db.meter_readings.insert_one(new_reading)
            
            return {
                "query_id": 11,
                "name": "INSERT Meter Reading",
                "operation": "insert",
                "success": True,
                "inserted_id": str(result.inserted_id),
                "document": {
                    "zone_id": zone_id,
                    "household_id": household_id,
                    "kwh": kwh,
                    "ts": ts.isoformat()
                },
                "message": f"Successfully inserted meter reading for {zone_id}/{household_id} with {kwh} kWh"
            }
        
        elif query_id == 12:
            # UPDATE Meter Reading
            zone_id = body.get("zone_id", "Z_001")
            household_id = body.get("household_id")
            new_kwh = body.get("new_kwh")
            
            if new_kwh is None:
                return {"error": "new_kwh is required for update", "results": []}
            
            query = {"zone_id": zone_id}
            if household_id:
                query["household_id"] = household_id
            
            # Find the most recent reading to update
            existing = db.meter_readings.find_one(query, sort=[("ts", -1)])
            if not existing:
                return {"error": f"No meter reading found for zone {zone_id}", "results": []}
            
            old_kwh = existing.get("kwh", 0)
            result = db.meter_readings.update_one(
                {"_id": existing["_id"]},
                {"$set": {"kwh": float(new_kwh)}}
            )
            
            return {
                "query_id": 12,
                "name": "UPDATE Meter Reading",
                "operation": "update",
                "success": True,
                "modified_count": result.modified_count,
                "document": {
                    "zone_id": zone_id,
                    "household_id": existing.get("household_id"),
                    "old_kwh": old_kwh,
                    "new_kwh": new_kwh,
                    "ts": existing.get("ts").isoformat() if existing.get("ts") else None
                },
                "message": f"Updated meter reading: {old_kwh} kWh → {new_kwh} kWh"
            }
        
        elif query_id == 13:
            # INSERT AQI Reading
            zone_id = body.get("zone_id", "Z_001")
            aqi = body.get("aqi", 50)
            temperature_c = body.get("temperature_c", 25.0)
            humidity = body.get("humidity", 50)
            ts_str = body.get("ts")
            
            if ts_str:
                try:
                    ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                except:
                    ts = datetime.now(timezone.utc)
            else:
                ts = datetime.now(timezone.utc)
            
            new_reading = {
                "zone_id": zone_id,
                "aqi": int(aqi),
                "temperature_c": float(temperature_c),
                "humidity": int(humidity),
                "ts": ts
            }
            
            result = db.air_climate_readings.insert_one(new_reading)
            
            return {
                "query_id": 13,
                "name": "INSERT AQI Reading",
                "operation": "insert",
                "success": True,
                "inserted_id": str(result.inserted_id),
                "document": {
                    "zone_id": zone_id,
                    "aqi": aqi,
                    "temperature_c": temperature_c,
                    "humidity": humidity,
                    "ts": ts.isoformat()
                },
                "message": f"Successfully inserted AQI reading for {zone_id}: AQI={aqi}, Temp={temperature_c}°C"
            }
        
        elif query_id == 14:
            # UPDATE AQI Reading
            zone_id = body.get("zone_id", "Z_001")
            new_aqi = body.get("new_aqi")
            new_temperature_c = body.get("new_temperature_c")
            
            if new_aqi is None and new_temperature_c is None:
                return {"error": "At least one of new_aqi or new_temperature_c is required", "results": []}
            
            # Find the most recent reading to update
            existing = db.air_climate_readings.find_one({"zone_id": zone_id}, sort=[("ts", -1)])
            if not existing:
                return {"error": f"No AQI reading found for zone {zone_id}", "results": []}
            
            old_aqi = existing.get("aqi", 0)
            old_temp = existing.get("temperature_c", 0)
            
            update_fields = {}
            if new_aqi is not None:
                update_fields["aqi"] = int(new_aqi)
            if new_temperature_c is not None:
                update_fields["temperature_c"] = float(new_temperature_c)
            
            result = db.air_climate_readings.update_one(
                {"_id": existing["_id"]},
                {"$set": update_fields}
            )
            
            return {
                "query_id": 14,
                "name": "UPDATE AQI Reading",
                "operation": "update",
                "success": True,
                "modified_count": result.modified_count,
                "document": {
                    "zone_id": zone_id,
                    "old_aqi": old_aqi,
                    "new_aqi": new_aqi if new_aqi is not None else old_aqi,
                    "old_temperature_c": old_temp,
                    "new_temperature_c": new_temperature_c if new_temperature_c is not None else old_temp,
                    "ts": existing.get("ts").isoformat() if existing.get("ts") else None
                },
                "message": f"Updated AQI reading: AQI {old_aqi}→{new_aqi or old_aqi}, Temp {old_temp}→{new_temperature_c or old_temp}°C"
            }
        
        elif query_id == 15:
            # DELETE Old Readings
            collection_name = body.get("collection", "meter_readings")
            hours_old = body.get("hours_old", 168)  # Default 1 week
            zone_id = body.get("zone_id")  # Optional: limit to specific zone
            
            if collection_name not in ["meter_readings", "air_climate_readings"]:
                return {"error": "collection must be 'meter_readings' or 'air_climate_readings'", "results": []}
            
            cutoff = datetime.now(timezone.utc) - timedelta(hours=int(hours_old))
            
            query = {"ts": {"$lt": cutoff}}
            if zone_id:
                query["zone_id"] = zone_id
            
            coll = db[collection_name]
            
            # Count before delete
            count_before = coll.count_documents(query)
            
            if count_before == 0:
                return {
                    "query_id": 15,
                    "name": "DELETE Old Readings",
                    "operation": "delete",
                    "success": True,
                    "deleted_count": 0,
                    "message": f"No readings older than {hours_old} hours found in {collection_name}"
                }
            
            result = coll.delete_many(query)
            
            return {
                "query_id": 15,
                "name": "DELETE Old Readings",
                "operation": "delete",
                "success": True,
                "deleted_count": result.deleted_count,
                "collection": collection_name,
                "cutoff_time": cutoff.isoformat(),
                "zone_id": zone_id,
                "message": f"Deleted {result.deleted_count} readings older than {hours_old} hours from {collection_name}"
            }
        
        else:
            return {"error": f"CRUD query {query_id} not found. Use queries 11-15 for CRUD operations.", "results": []}
    
    except Exception as e:
        return {"error": str(e), "results": []}
