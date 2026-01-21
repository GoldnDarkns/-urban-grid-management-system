"""
API routes for Incident Reports with NLP processing.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from pymongo.errors import PyMongoError

from backend.routes.data import safe_get_db
from src.nlp.incident_processor import process_incident

router = APIRouter(prefix="/incidents", tags=["incidents"])

@router.get("/")
async def get_incidents(
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    zone_id: Optional[str] = None,
    category: Optional[str] = None,
    urgency: Optional[str] = None,
    status: Optional[str] = None,
    days: int = Query(30, ge=1, le=365)
):
    """Get incident reports with optional filters."""
    try:
        db = safe_get_db()
        if db is None:
            return {"incidents": [], "count": 0, "error": "MongoDB connection failed"}
        
        # Build query
        query = {}
        
        # Time filter
        since_date = datetime.now(timezone.utc) - timedelta(days=days)
        query["timestamp"] = {"$gte": since_date}
        
        if zone_id:
            query["zone_id"] = zone_id
        if category:
            query["nlp_analysis.category"] = category
        if urgency:
            query["nlp_analysis.urgency"] = urgency
        if status:
            query["status"] = status
        
        # Get incidents
        cursor = db.incident_reports.find(query).sort("timestamp", -1).skip(skip).limit(limit)
        incidents = list(cursor)
        
        # Convert ObjectId and datetime
        for incident in incidents:
            incident["id"] = str(incident.pop("_id"))
            if isinstance(incident.get("timestamp"), datetime):
                incident["timestamp"] = incident["timestamp"].isoformat()
            if isinstance(incident.get("resolved_at"), datetime):
                incident["resolved_at"] = incident["resolved_at"].isoformat()
            if isinstance(incident.get("created_at"), datetime):
                incident["created_at"] = incident["created_at"].isoformat()
        
        # Get total count
        total_count = db.incident_reports.count_documents(query)
        
        return {
            "incidents": incidents,
            "count": len(incidents),
            "total": total_count,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{incident_id}")
async def get_incident(incident_id: str):
    """Get a specific incident by ID."""
    try:
        db = safe_get_db()
        if db is None:
            raise HTTPException(status_code=503, detail="MongoDB connection failed")
        
        incident = db.incident_reports.find_one({"_id": incident_id})
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        incident["id"] = str(incident.pop("_id"))
        if isinstance(incident.get("timestamp"), datetime):
            incident["timestamp"] = incident["timestamp"].isoformat()
        if isinstance(incident.get("resolved_at"), datetime):
            incident["resolved_at"] = incident["resolved_at"].isoformat()
        if isinstance(incident.get("created_at"), datetime):
            incident["created_at"] = incident["created_at"].isoformat()
        
        return incident
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_incident(
    description: str,
    zone_id: str,
    reporter: Optional[str] = "manual_submission"
):
    """Create a new incident report with NLP processing."""
    try:
        db = safe_get_db()
        if db is None:
            raise HTTPException(status_code=503, detail="MongoDB connection failed")
        
        # Validate zone exists
        zone = db.zones.find_one({"_id": zone_id})
        if not zone:
            raise HTTPException(status_code=404, detail=f"Zone {zone_id} not found")
        
        zone_name = zone.get("name", zone_id)
        
        # Get zone metrics for context
        aqi_reading = db.air_climate_readings.find_one(
            {"zone_id": zone_id},
            sort=[("ts", -1)]
        )
        current_aqi = aqi_reading["aqi"] if aqi_reading else 50
        
        demand_reading = db.meter_readings.find_one(
            {"zone_id": zone_id},
            sort=[("ts", -1)]
        )
        current_demand = demand_reading["kwh"] if demand_reading else 0
        
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        recent_alerts = db.alerts.count_documents({
            "zone_id": zone_id,
            "ts": {"$gte": week_ago}
        })
        
        # Calculate risk level
        risk_score = 0
        if current_aqi > 200:
            risk_score += 15
        elif current_aqi > 150:
            risk_score += 8
        if recent_alerts > 5:
            risk_score += 10
        elif recent_alerts > 2:
            risk_score += 5
        if "hospital" in zone.get("critical_sites", []):
            risk_score += 8
        
        if risk_score >= 15:
            risk_level = "high"
        elif risk_score >= 8:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        context = {
            "zone_risk_score": risk_score,
            "zone_risk_level": risk_level,
            "current_aqi": current_aqi,
            "current_demand": current_demand,
            "recent_alerts": recent_alerts,
            "has_hospital": "hospital" in zone.get("critical_sites", []),
            "grid_priority": zone.get("grid_priority", 3)
        }
        
        # Process with NLP
        nlp_analysis = process_incident(description, context, zone_name)
        
        # Generate incident ID
        count = db.incident_reports.count_documents({})
        incident_id = f"INC_{str(count + 1).zfill(5)}"
        
        # Create incident
        incident = {
            "_id": incident_id,
            "zone_id": zone_id,
            "zone_name": zone_name,
            "timestamp": datetime.now(timezone.utc),
            "reporter": reporter,
            "description": description,
            "nlp_analysis": nlp_analysis,
            "context": context,
            "status": "open",
            "resolved_at": None,
            "created_at": datetime.now(timezone.utc)
        }
        
        db.incident_reports.insert_one(incident)
        
        incident["id"] = str(incident.pop("_id"))
        if isinstance(incident.get("timestamp"), datetime):
            incident["timestamp"] = incident["timestamp"].isoformat()
        if isinstance(incident.get("created_at"), datetime):
            incident["created_at"] = incident["created_at"].isoformat()
        
        return incident
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/summary")
async def get_incidents_summary(days: int = Query(30, ge=1, le=365)):
    """Get summary statistics for incident reports."""
    try:
        db = safe_get_db()
        if db is None:
            return {"error": "MongoDB connection failed"}
        
        since_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Total incidents
        total = db.incident_reports.count_documents({"timestamp": {"$gte": since_date}})
        
        # By category
        category_pipeline = [
            {"$match": {"timestamp": {"$gte": since_date}}},
            {"$group": {
                "_id": "$nlp_analysis.category",
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}}
        ]
        categories = {r["_id"]: r["count"] for r in db.incident_reports.aggregate(category_pipeline)}
        
        # By urgency
        urgency_pipeline = [
            {"$match": {"timestamp": {"$gte": since_date}}},
            {"$group": {
                "_id": "$nlp_analysis.urgency",
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        urgencies = {r["_id"]: r["count"] for r in db.incident_reports.aggregate(urgency_pipeline)}
        
        # By status
        status_pipeline = [
            {"$match": {"timestamp": {"$gte": since_date}}},
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        statuses = {r["_id"]: r["count"] for r in db.incident_reports.aggregate(status_pipeline)}
        
        # By zone
        zone_pipeline = [
            {"$match": {"timestamp": {"$gte": since_date}}},
            {"$group": {
                "_id": "$zone_id",
                "count": {"$sum": 1},
                "zone_name": {"$first": "$zone_name"}
            }},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        top_zones = [
            {"zone_id": r["_id"], "zone_name": r.get("zone_name", r["_id"]), "count": r["count"]}
            for r in db.incident_reports.aggregate(zone_pipeline)
        ]
        
        # Sentiment distribution
        sentiment_pipeline = [
            {"$match": {"timestamp": {"$gte": since_date}}},
            {"$group": {
                "_id": "$nlp_analysis.sentiment",
                "count": {"$sum": 1}
            }}
        ]
        sentiments = {r["_id"]: r["count"] for r in db.incident_reports.aggregate(sentiment_pipeline)}
        
        return {
            "total": total,
            "categories": categories,
            "urgencies": urgencies,
            "statuses": statuses,
            "top_zones": top_zones,
            "sentiments": sentiments,
            "days": days
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/trends")
async def get_incidents_trends(days: int = Query(30, ge=1, le=365)):
    """Get incident trends over time."""
    try:
        db = safe_get_db()
        if db is None:
            return {"error": "MongoDB connection failed"}
        
        since_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Group by day
        pipeline = [
            {"$match": {"timestamp": {"$gte": since_date}}},
            {"$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": "$timestamp"
                    }
                },
                "count": {"$sum": 1},
                "categories": {"$push": "$nlp_analysis.category"},
                "urgencies": {"$push": "$nlp_analysis.urgency"}
            }},
            {"$sort": {"_id": 1}}
        ]
        
        trends = list(db.incident_reports.aggregate(pipeline))
        
        # Process trends
        daily_data = []
        for trend in trends:
            # Count categories
            category_counts = {}
            for cat in trend["categories"]:
                category_counts[cat] = category_counts.get(cat, 0) + 1
            
            # Count urgencies
            urgency_counts = {}
            for urg in trend["urgencies"]:
                urgency_counts[urg] = urgency_counts.get(urg, 0) + 1
            
            daily_data.append({
                "date": trend["_id"],
                "count": trend["count"],
                "categories": category_counts,
                "urgencies": urgency_counts
            })
        
        return {"trends": daily_data, "days": days}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
