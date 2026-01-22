"""
MongoDB Queries API routes - Execute the 10 meaningful MongoDB queries.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.db.mongo_client import get_db, ping
from backend.routes.data import safe_get_db
from pymongo.errors import ConnectionFailure

router = APIRouter(prefix="/api/queries", tags=["Queries"])


@router.get("/list")
async def list_all_queries():
    """List all available MongoDB queries."""
    queries = [
        {
            "id": 1,
            "name": "Zones with Hospitals",
            "description": "List all zones that contain hospitals",
            "type": "basic",
            "collection": "zones"
        },
        {
            "id": 2,
            "name": "Top Zones by Priority",
            "description": "List top N zones by grid priority",
            "type": "basic",
            "collection": "zones"
        },
        {
            "id": 3,
            "name": "Zone Adjacency",
            "description": "Show adjacency list for a given zone",
            "type": "basic",
            "collection": "grid_edges"
        },
        {
            "id": 4,
            "name": "Hourly Demand by Zone",
            "description": "Aggregate hourly energy demand for a specific zone",
            "type": "advanced",
            "collection": "meter_readings"
        },
        {
            "id": 5,
            "name": "AQI Threshold Violations",
            "description": "Find zones that exceeded AQI policy thresholds",
            "type": "advanced",
            "collection": "air_climate_readings"
        },
        {
            "id": 6,
            "name": "Consumption Anomalies",
            "description": "Find households with consumption anomalies",
            "type": "advanced",
            "collection": "meter_readings"
        },
        {
            "id": 7,
            "name": "Active Constraint Events",
            "description": "Find currently active or recent constraint events",
            "type": "advanced",
            "collection": "constraint_events"
        },
        {
            "id": 8,
            "name": "Zone Risk Factors",
            "description": "Calculate risk factors for each zone",
            "type": "advanced",
            "collection": "zones"
        },
        {
            "id": 9,
            "name": "Demand vs Temperature",
            "description": "Analyze correlation between temperature and energy demand",
            "type": "advanced",
            "collection": "meter_readings"
        },
        {
            "id": 10,
            "name": "Critical Infrastructure Status",
            "description": "Comprehensive status report for critical infrastructure zones",
            "type": "advanced",
            "collection": "zones"
        }
    ]
    return {"queries": queries, "total": len(queries)}


@router.get("/execute/{query_id}")
async def execute_query(
    query_id: int,
    zone_id: Optional[str] = None,
    limit: int = Query(10, ge=1, le=100),
    hours: int = Query(24, ge=1, le=168)
):
    """Execute a specific MongoDB query."""
    db = safe_get_db()
    if db is None:
        return {"error": "MongoDB connection failed", "results": []}
    
    try:
        if query_id == 1:
            # Query 1: Zones with hospitals
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
            zone = db.zones.find_one({"_id": zone_id})
            if not zone:
                return {"error": f"Zone {zone_id} not found", "results": []}
            
            neighbors = list(db.grid_edges.find({"from_zone": zone_id}))
            neighbor_ids = [n["to_zone"] for n in neighbors]
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
            return {"query_id": 3, "name": "Zone Adjacency", "results": results, "count": len(neighbor_zones)}
        
        elif query_id == 4:
            # Query 4: Hourly demand by zone
            if not zone_id:
                zone_id = "Z_001"
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
            policy = db.policies.find_one({"_id": "POL_AQI_CONTROL_V1"})
            watch_threshold = 101
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
        
        else:
            return {"error": f"Query {query_id} not found", "results": []}
    
    except Exception as e:
        return {"error": str(e), "results": []}
