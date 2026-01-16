"""
Simulation API routes - Save and retrieve simulation runs with algorithm recommendations.
"""
from fastapi import APIRouter, HTTPException
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pymongo import DESCENDING
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.db.mongo_client import get_db
from pymongo.errors import ConnectionFailure

router = APIRouter()


def safe_get_db():
    """Safely get database connection, return None if connection fails."""
    try:
        return get_db()
    except (ConnectionFailure, Exception) as e:
        return None


def get_algorithm_recommendations(scenario_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate recommendations from each ML model based on simulation data.
    
    This simulates what each model would recommend based on the scenario.
    """
    scenario_type = scenario_data.get("scenario_id", "")
    intensity = scenario_data.get("intensity", 70) / 100
    peak_demand = scenario_data.get("peak_demand", 0)
    avg_aqi = scenario_data.get("avg_aqi", 0)
    high_risk_zones = scenario_data.get("high_risk_zones", 0)
    total_zones = scenario_data.get("total_zones", 1)
    
    recommendations = {
        "lstm": {
            "model": "LSTM Demand Forecasting",
            "recommendations": [],
            "forecast": {},
            "confidence": 0.85
        },
        "gnn": {
            "model": "GNN Zone Risk Scoring",
            "recommendations": [],
            "risk_analysis": {},
            "confidence": 0.92
        },
        "autoencoder": {
            "model": "Autoencoder Anomaly Detection",
            "recommendations": [],
            "anomaly_score": 0,
            "confidence": 0.88
        }
    }
    
    # LSTM Recommendations (Demand Forecasting)
    if peak_demand > 50000:
        recommendations["lstm"]["recommendations"].append({
            "priority": "high",
            "action": "Activate Demand-Side Management (DSM)",
            "details": f"Peak demand ({peak_demand:,.0f} kW) exceeds normal capacity. LSTM predicts sustained high demand.",
            "steps": [
                "Reduce non-essential commercial cooling by 20%",
                "Delay EV charging to off-peak hours (10 PM - 6 AM)",
                "Implement time-of-use pricing incentives",
                "Activate backup generators if available"
            ]
        })
    elif peak_demand > 40000:
        recommendations["lstm"]["recommendations"].append({
            "priority": "medium",
            "action": "Monitor demand closely",
            "details": "Demand approaching capacity limits. Prepare DSM protocols.",
            "steps": [
                "Alert commercial zones to reduce peak-hour usage",
                "Prepare load-shedding schedule if needed"
            ]
        })
    
    if scenario_type in ["heatwave", "powerSurge"]:
        recommendations["lstm"]["forecast"] = {
            "next_24h": "Sustained high demand expected",
            "peak_hour": "14:00-18:00",
            "demand_increase": f"+{int(intensity * 60)}%"
        }
        recommendations["lstm"]["recommendations"].append({
            "priority": "high",
            "action": "Pre-cooling strategy",
            "details": "LSTM pattern recognition suggests pre-cooling buildings before peak hours.",
            "steps": [
                "Start cooling 2 hours before peak (12:00 PM)",
                "Set thermostats 2°C lower during off-peak",
                "Reduce cooling during peak hours (2-6 PM)"
            ]
        })
    
    # GNN Recommendations (Risk Scoring)
    risk_ratio = high_risk_zones / total_zones if total_zones > 0 else 0
    
    if risk_ratio > 0.3:
        recommendations["gnn"]["recommendations"].append({
            "priority": "critical",
            "action": "Emergency response protocol",
            "details": f"GNN network analysis shows {high_risk_zones} zones at high risk. Risk propagation detected.",
            "steps": [
                "Prioritize critical infrastructure zones (hospitals, water, power)",
                "Isolate high-risk zones from grid if necessary",
                "Activate emergency backup systems",
                "Coordinate with neighboring zones to prevent cascading failures"
            ]
        })
        recommendations["gnn"]["risk_analysis"] = {
            "network_effect": "High - Risk spreading through connections",
            "critical_zones_at_risk": "Multiple",
            "cascade_probability": "Medium-High"
        }
    elif risk_ratio > 0.15:
        recommendations["gnn"]["recommendations"].append({
            "priority": "high",
            "action": "Monitor network effects",
            "details": "GNN detects elevated risk in connected zones. Monitor for propagation.",
            "steps": [
                "Increase monitoring frequency for connected zones",
                "Prepare isolation protocols",
                "Check critical infrastructure status"
            ]
        })
        recommendations["gnn"]["risk_analysis"] = {
            "network_effect": "Medium - Some risk propagation",
            "critical_zones_at_risk": "Few",
            "cascade_probability": "Low-Medium"
        }
    
    if scenario_type == "fire":
        recommendations["gnn"]["recommendations"].append({
            "priority": "critical",
            "action": "Zone isolation required",
            "details": "GNN identifies fire-affected zones need immediate isolation to prevent spread.",
            "steps": [
                "Cut power to affected zones immediately",
                "Redirect power through alternative routes",
                "Activate emergency services priority grid"
            ]
        })
    
    # Autoencoder Recommendations (Anomaly Detection)
    # Calculate anomaly score based on scenario
    anomaly_score = 0
    if scenario_type == "powerSurge":
        anomaly_score = 0.95  # Very high anomaly
    elif scenario_type in ["fire", "flood"]:
        anomaly_score = 0.85
    elif scenario_type == "heatwave":
        anomaly_score = 0.70
    elif scenario_type == "sandstorm":
        anomaly_score = 0.75
    else:
        anomaly_score = 0.50
    
    recommendations["autoencoder"]["anomaly_score"] = anomaly_score
    
    if anomaly_score > 0.8:
        recommendations["autoencoder"]["recommendations"].append({
            "priority": "critical",
            "action": "Severe anomaly detected",
            "details": f"Autoencoder reconstruction error ({anomaly_score:.2%}) indicates severe deviation from normal patterns.",
            "steps": [
                "Investigate root cause immediately",
                "Check for equipment failures",
                "Verify sensor accuracy",
                "Review recent system changes"
            ]
        })
    elif anomaly_score > 0.6:
        recommendations["autoencoder"]["recommendations"].append({
            "priority": "high",
            "action": "Anomaly detected",
            "details": "Patterns deviate significantly from normal. Investigation recommended.",
            "steps": [
                "Review consumption patterns",
                "Check for unusual loads",
                "Monitor for equipment issues"
            ]
        })
    
    if avg_aqi > 200:
        recommendations["autoencoder"]["recommendations"].append({
            "priority": "high",
            "action": "Air quality anomaly",
            "details": "AQI levels are anomalous. May indicate sensor malfunction or real emergency.",
            "steps": [
                "Verify AQI sensors are functioning",
                "Check for pollution sources",
                "Activate air quality protocols if confirmed"
            ]
        })
    
    return recommendations


@router.post("/save")
async def save_simulation(simulation_data: Dict[str, Any]):
    """
    Save a simulation run to MongoDB.
    
    Expected data structure:
    {
        "scenario_id": "heatwave",
        "scenario_name": "Heatwave",
        "intensity": 70,
        "duration": 24,
        "timestamp": "2024-01-01T12:00:00Z",
        "hourly_data": [
            {
                "hour": 0,
                "total_demand": 35000,
                "avg_aqi": 85,
                "high_risk_zones": 2,
                "medium_risk_zones": 5,
                "low_risk_zones": 13,
                "zone_details": [...]
            },
            ...
        ],
        "summary": {
            "peak_demand": 45000,
            "avg_demand": 38000,
            "peak_aqi": 120,
            "avg_aqi": 95,
            "max_high_risk": 5,
            "total_zones": 20
        }
    }
    """
    db = safe_get_db()
    if db is None:
        return {"error": "MongoDB connection failed", "saved": False}
    
    try:
        # Add metadata
        simulation_doc = {
            **simulation_data,
            "created_at": datetime.now(timezone.utc),
            "simulation_id": f"SIM_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        }
        
        # Generate algorithm recommendations
        summary = simulation_data.get("summary", {})
        scenario_summary = {
            "scenario_id": simulation_data.get("scenario_id", ""),
            "intensity": simulation_data.get("intensity", 70),
            "peak_demand": summary.get("peak_demand", 0),
            "avg_aqi": summary.get("avg_aqi", 0),
            "high_risk_zones": summary.get("max_high_risk", 0),
            "total_zones": summary.get("total_zones", 20)
        }
        
        recommendations = get_algorithm_recommendations(scenario_summary)
        simulation_doc["algorithm_recommendations"] = recommendations
        
        # Save to MongoDB
        result = db.simulations.insert_one(simulation_doc)
        
        return {
            "saved": True,
            "simulation_id": simulation_doc["simulation_id"],
            "mongodb_id": str(result.inserted_id),
            "recommendations": recommendations
        }
    except Exception as e:
        return {"error": str(e), "saved": False}


@router.get("/list")
async def list_simulations(limit: int = 20, skip: int = 0):
    """List all saved simulations."""
    db = safe_get_db()
    if db is None:
        return {"simulations": [], "count": 0, "error": "MongoDB connection failed"}
    
    try:
        simulations = list(
            db.simulations.find()
            .sort("created_at", DESCENDING)
            .skip(skip)
            .limit(limit)
        )
        
        # Convert ObjectId to string
        for sim in simulations:
            sim["_id"] = str(sim["_id"])
        
        count = db.simulations.count_documents({})
        
        return {
            "simulations": simulations,
            "count": count,
            "returned": len(simulations)
        }
    except Exception as e:
        return {"simulations": [], "count": 0, "error": str(e)}


@router.get("/{simulation_id}")
async def get_simulation(simulation_id: str):
    """Get a specific simulation by ID."""
    db = safe_get_db()
    if db is None:
        return {"error": "MongoDB connection failed"}
    
    try:
        from bson import ObjectId
        
        # Try ObjectId first
        try:
            sim = db.simulations.find_one({"_id": ObjectId(simulation_id)})
        except:
            sim = None
        
        # Try simulation_id field
        if not sim:
            sim = db.simulations.find_one({"simulation_id": simulation_id})
        
        if not sim:
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        sim["_id"] = str(sim["_id"])
        return sim
    except HTTPException:
        raise
    except Exception as e:
        return {"error": str(e)}


@router.get("/{simulation_id}/analytics")
async def get_simulation_analytics(simulation_id: str):
    """Get analytics for a specific simulation."""
    db = safe_get_db()
    if db is None:
        return {"error": "MongoDB connection failed"}
    
    try:
        from bson import ObjectId
        
        # Try ObjectId first
        try:
            sim = db.simulations.find_one({"_id": ObjectId(simulation_id)})
        except:
            sim = None
        
        # Try simulation_id field
        if not sim:
            sim = db.simulations.find_one({"simulation_id": simulation_id})
        
        if not sim:
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        hourly_data = sim.get("hourly_data", [])
        summary = sim.get("summary", {})
        
        # Calculate analytics
        analytics = {
            "simulation_id": sim.get("simulation_id"),
            "scenario": sim.get("scenario_name", "Unknown"),
            "duration": sim.get("duration", 0),
            "summary": summary,
            "hourly_trends": {
                "demand": [h.get("total_demand", 0) for h in hourly_data],
                "aqi": [h.get("avg_aqi", 0) for h in hourly_data],
                "high_risk": [h.get("high_risk_zones", 0) for h in hourly_data],
                "medium_risk": [h.get("medium_risk_zones", 0) for h in hourly_data],
                "hours": list(range(len(hourly_data)))
            },
            "peak_events": {
                "peak_demand_hour": max(enumerate([h.get("total_demand", 0) for h in hourly_data]), key=lambda x: x[1])[0] if hourly_data else 0,
                "peak_aqi_hour": max(enumerate([h.get("avg_aqi", 0) for h in hourly_data]), key=lambda x: x[1])[0] if hourly_data else 0,
                "max_risk_hour": max(enumerate([h.get("high_risk_zones", 0) for h in hourly_data]), key=lambda x: x[1])[0] if hourly_data else 0
            },
            "algorithm_recommendations": sim.get("algorithm_recommendations", {})
        }
        
        return analytics
    except HTTPException:
        raise
    except Exception as e:
        return {"error": str(e)}
