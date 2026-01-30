"""
AI Recommendations API - OpenRouter-powered intelligent recommendations
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
import sys
import os
import requests

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.routes.data import safe_get_db, safe_get_db_mode, _get_mode
from backend.routes.analytics import safe_get_db as analytics_safe_get_db
from backend.routes.models import get_models_overview
from backend.services.cost_service import compute_costs
from fastapi import Request, Query
from typing import Optional
import json

router = APIRouter(tags=["AI Recommendations"])

# OpenRouter: use env so you can set a new key without editing code
# 402 = insufficient credits (not an invalid key). Add credits at https://openrouter.ai/settings/credits or lower OPENROUTER_MAX_TOKENS.
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_API_URL = os.getenv("OPENROUTER_API_URL", "https://openrouter.ai/api/v1/chat/completions")
OPENROUTER_MAX_TOKENS = int(os.getenv("OPENROUTER_MAX_TOKENS", "512"))  # Lower = fewer credits per request (e.g. 256 if tight)

# Mistral: fallback when OpenRouter fails (same OpenAI-compatible chat format)
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
MISTRAL_API_URL = os.getenv("MISTRAL_API_URL", "https://api.mistral.ai/v1/chat/completions")
MISTRAL_MODEL = os.getenv("MISTRAL_MODEL", "mistral-small-latest")

# Model to use (OpenRouter supports multiple models)
# Options: "openai/gpt-3.5-turbo", "openai/gpt-4", "anthropic/claude-3-haiku", etc.
DEFAULT_MODEL = "openai/gpt-3.5-turbo"  # Fast and reliable

# System Prompt - Project-specific context
SYSTEM_PROMPT = """You are an AI advisor for an Urban Grid Management System. You understand this specific project deeply.

PROJECT CONTEXT:
This system helps cities manage electricity demand, emissions, and grid stability during extreme conditions (heatwaves, lockdowns, high AQI events).

THE CORE PROBLEM:
1. Heat/Lockdown → People stay indoors → AC usage spikes → Demand increases
2. High demand → More power generation → Emissions rise → AQI worsens
3. High AQI → City must restrict activities → Grid flexibility decreases
4. High demand + Low flexibility → Grid becomes fragile → Risk of blackouts
5. City must balance: Keep people safe (power) vs. Reduce pollution vs. Prevent blackouts

DOMAIN KNOWLEDGE (PROJECT-SPECIFIC):
- AQI (Air Quality Index): 0-500 scale. Watch level: 101, Alert: 151, Emergency: 201
- Zones: 20 zones in the city, each has:
  * grid_priority (1-10, higher = more critical)
  * critical_sites (hospitals, data centers, etc.)
  * population_est (estimated residents)
- Risk Levels: Low (<30), Medium (30-60), High (>60)
- ML Models in this system:
  * TFT: Primary demand forecasting (interpretable multi-horizon). LSTM kept for comparison (RMSE: 64.27, R²: 0.64)
  * ARIMA: Statistical demand forecasting. RMSE: 88.82, R²: 0.5352
  * Prophet: Seasonal forecasting (BEST). RMSE: 48.41, R²: 0.8619
  * Autoencoder: Detects consumption anomalies (threshold: 0.026, anomaly rate: 5.33%)
  * GNN: Zone risk scoring with network effects (considers adjacent zones)

AVAILABLE ACTIONS:
1. Load Balancing: Redistribute demand from overloaded zones to adjacent zones
2. Demand Response: Reduce non-critical consumption during peaks
3. AQI Mitigation: Reduce industrial load, issue health advisories
4. Emergency Protocols: Activate backup systems, prioritize critical infrastructure
5. Preventive Actions: Schedule maintenance, pre-position resources
6. Simulation Scenarios: Run what-if analysis for different strategies

YOUR ROLE:
Analyze the current system state (all ML model outputs, alerts, anomalies, risk scores) and provide:
1. Prioritized recommendations (ranked by urgency and impact)
2. Specific actions with expected outcomes
3. Cost-benefit analysis when possible
4. Confidence scores for each recommendation
5. Suggested simulation scenarios to test strategies

BE SPECIFIC:
- Reference actual zone IDs (Z_001, Z_002, etc.)
- Use actual risk scores and AQI values
- Suggest concrete actions, not generic advice
- Consider network effects (adjacent zones)
- Balance multiple objectives (demand, emissions, reliability)

OUTPUT FORMAT:
Provide recommendations as JSON with:
- priority (1-10, 10 = most urgent)
- action_type (load_balancing, demand_response, aqi_mitigation, etc.)
- title (short action description)
- description (detailed explanation)
- affected_zones (list of zone IDs)
- expected_impact (what will happen)
- confidence (0-1)
- cost_estimate (if available)
- suggested_simulation (what scenario to test)
"""


def compile_system_state(mode: str = "sim", city_id: Optional[str] = None) -> Dict[str, Any]:
    """Compile all ML model outputs and current system state."""
    db = safe_get_db_mode(mode)
    if db is None:
        return {"error": "Database connection failed"}
    
    state = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ml_models": {},
        "zone_risk": [],
        "alerts": [],
        "anomalies": [],
        "demand_forecast": {},
        "aqi_status": {},
        "constraint_events": [],
        "costs": None,
    }
    
    try:
        # Get ML model overview
        try:
            # Import and call the function directly
            from backend.routes.models import get_models_overview
            models_data = get_models_overview()
            # Handle both dict and response object
            if isinstance(models_data, dict):
                state["ml_models"] = models_data
            else:
                state["ml_models"] = {"models": []}
        except Exception as e:
            print(f"Error getting models overview: {e}")
            state["ml_models"] = {"models": []}
        
        # Get zone risk scores
        try:
            if mode == "city" and city_id:
                # CITY MODE: Use processed_zone_data
                query = {"city_id": city_id}
                processed_zones = list(db.processed_zone_data.find(query).sort("timestamp", -1).limit(100))
                risk_scores = []
                for zone in processed_zones:
                    ml = zone.get("ml_processed", {})
                    risk = ml.get("risk_score", {})
                    raw = zone.get("raw_data", {})
                    risk_scores.append({
                        "zone_id": zone.get("zone_id"),
                        "zone_name": zone.get("zone_id", "").replace("_", " ").upper(),
                        "risk_score": risk.get("score", 0),
                        "risk_level": risk.get("level", "low"),
                        "grid_priority": zone.get("grid_priority", 1),
                        "critical_sites": zone.get("critical_sites", []),
                        "aqi": {"avg_aqi": raw.get("aqi", {}).get("aqi", 0)} if raw.get("aqi") else None,
                        "demand": {"max_kwh": ml.get("demand_forecast", {}).get("next_hour_kwh", 0)} if ml.get("demand_forecast") else None
                    })
                state["zone_risk"] = risk_scores
            else:
                # SIM MODE: Use original logic
                zones = list(db.zones.find())
                cutoff = datetime.utcnow() - timedelta(hours=24)
                risk_scores = []
                for zone in zones:
                    zone_id = zone["_id"]
                    demand_pipeline = [
                        {"$match": {"zone_id": zone_id, "ts": {"$gte": cutoff}}},
                        {"$group": {"_id": None, "total_kwh": {"$sum": "$kwh"}, "max_kwh": {"$max": "$kwh"}}}
                    ]
                    demand = list(db.meter_readings.aggregate(demand_pipeline))
                    aqi_pipeline = [
                        {"$match": {"zone_id": zone_id, "ts": {"$gte": cutoff}}},
                        {"$group": {"_id": None, "avg_aqi": {"$avg": "$aqi"}, "max_aqi": {"$max": "$aqi"}}}
                    ]
                    aqi = list(db.air_climate_readings.aggregate(aqi_pipeline))
                    risk_score = zone.get("grid_priority", 1) * 10
                    if zone.get("critical_sites"):
                        risk_score += len(zone["critical_sites"]) * 15
                    if aqi and aqi[0].get("avg_aqi"):
                        avg_aqi = aqi[0]["avg_aqi"]
                        if avg_aqi > 150:
                            risk_score += 30
                        elif avg_aqi > 100:
                            risk_score += 15
                    if demand and demand[0].get("max_kwh") and demand[0]["max_kwh"] > 2:
                        risk_score += 20
                    risk_level = "high" if risk_score > 60 else "medium" if risk_score > 30 else "low"
                    risk_scores.append({
                        "zone_id": zone_id,
                        "zone_name": zone["name"],
                        "risk_score": risk_score,
                        "risk_level": risk_level,
                        "grid_priority": zone.get("grid_priority", 1),
                        "critical_sites": zone.get("critical_sites", []),
                        "aqi": {"avg_aqi": round(aqi[0]["avg_aqi"], 1)} if aqi and aqi[0].get("avg_aqi") else None,
                        "demand": {"max_kwh": round(demand[0]["max_kwh"], 2)} if demand and demand[0].get("max_kwh") else None
                    })
                state["zone_risk"] = risk_scores
        except Exception as e:
            print(f"Error getting zone risk: {e}")
            state["zone_risk"] = []
        
        # Get recent alerts
        try:
            alerts = list(db.alerts.find().sort("ts", -1).limit(20))
            state["alerts"] = [
                {
                    "zone_id": a.get("zone_id"),
                    "level": a.get("level"),
                    "type": a.get("type"),
                    "message": a.get("message"),
                    "aqi_value": a.get("aqi_value"),
                    "timestamp": a.get("ts").isoformat() if isinstance(a.get("ts"), datetime) else str(a.get("ts"))
                }
                for a in alerts
            ]
        except Exception as e:
            print(f"Error getting alerts: {e}")
        
        # Get anomalies
        try:
            if mode == "city" and city_id:
                # CITY MODE: Use processed_zone_data anomaly_detection
                query = {"city_id": city_id}
                processed_zones = list(db.processed_zone_data.find(query).sort("timestamp", -1).limit(100))
                anomalies = []
                for zone in processed_zones:
                    anomaly = zone.get("ml_processed", {}).get("anomaly_detection", {})
                    if anomaly.get("is_anomaly"):
                        anomalies.append({
                            "zone_id": zone.get("zone_id"),
                            "anomaly_score": round(anomaly.get("anomaly_score", 0), 3),
                            "current_demand": round(anomaly.get("current_demand", 0), 2),
                            "threshold": round(anomaly.get("threshold", 0), 2)
                        })
                state["anomalies"] = anomalies[:20]
            else:
                # SIM MODE: Use original logic
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
                                "kwh": round(reading["kwh"], 2),
                                "multiplier": round(reading["kwh"] / hourly_baseline, 1)
                            })
                anomalies.sort(key=lambda x: x["multiplier"], reverse=True)
                state["anomalies"] = anomalies[:20]
        except Exception as e:
            print(f"Error getting anomalies: {e}")
            state["anomalies"] = []
        
        # Get demand forecast (TFT primary; LSTM comparison)
        try:
            if mode == "city" and city_id:
                # CITY MODE: Use processed_zone_data demand_forecast
                query = {"city_id": city_id}
                processed_zones = list(db.processed_zone_data.find(query).sort("timestamp", -1).limit(100))
                total_demand = 0
                forecasts = []
                for zone in processed_zones:
                    forecast = zone.get("ml_processed", {}).get("demand_forecast", {})
                    if forecast.get("next_hour_kwh"):
                        total_demand += forecast["next_hour_kwh"]
                        forecasts.append(forecast["next_hour_kwh"])
                state["demand_forecast"] = {
                    "recent_24h_demand": round(total_demand, 2),
                    "avg_hourly_demand": round(total_demand / max(len(forecasts), 1), 2),
                    "forecast_available": len(forecasts) > 0,
                    "zones_with_forecast": len(forecasts)
                }
            else:
                # SIM MODE: Use original logic
                recent_demand = list(db.meter_readings.find().sort("ts", -1).limit(24))
                total_demand = sum(r["kwh"] for r in recent_demand)
                state["demand_forecast"] = {
                    "recent_24h_demand": round(total_demand, 2),
                    "avg_hourly_demand": round(total_demand / 24, 2),
                    "forecast_available": True
                }
        except Exception as e:
            print(f"Error getting demand forecast: {e}")
            state["demand_forecast"] = {}
        
        # Get AQI status by zone
        try:
            db = safe_get_db()
            if db is not None:
                cutoff = datetime.utcnow() - timedelta(hours=24)
                aqi_by_zone = {}
                zones = list(db.zones.find())
                for zone in zones:
                    zone_id = zone["_id"]
                    aqi_pipeline = [
                        {"$match": {"zone_id": zone_id, "ts": {"$gte": cutoff}}},
                        {"$group": {
                            "_id": None,
                            "avg_aqi": {"$avg": "$aqi"},
                            "max_aqi": {"$max": "$aqi"},
                            "min_aqi": {"$min": "$aqi"}
                        }}
                    ]
                    aqi_data = list(db.air_climate_readings.aggregate(aqi_pipeline))
                    if aqi_data:
                        aqi_by_zone[zone_id] = {
                            "avg_aqi": round(aqi_data[0]["avg_aqi"], 1),
                            "max_aqi": round(aqi_data[0]["max_aqi"], 1),
                            "min_aqi": round(aqi_data[0]["min_aqi"], 1)
                        }
                state["aqi_status"] = aqi_by_zone
        except Exception as e:
            print(f"Error getting AQI: {e}")
            state["aqi_status"] = {}
        
        # Get active constraint events
        try:
            if db is not None:
                now = datetime.utcnow()
                events = list(db.constraint_events.find({
                    "end_ts": {"$gte": now}
                }).sort("start_ts", -1).limit(10))
                state["constraint_events"] = [
                    {
                        "type": e.get("type"),
                        "severity": e.get("severity"),
                        "reason": e.get("reason"),
                        "zones_affected": e.get("zones_affected", [])
                    }
                    for e in events
                ]
            else:
                state["constraint_events"] = []
        except Exception as e:
            print(f"Error getting constraint events: {e}")

        # Cost summary (City mode): energy + CO2 from processed data + EIA price
        try:
            if mode == "city" and city_id:
                state["costs"] = compute_costs(city_id)
        except Exception as e:
            print(f"Error computing costs: {e}")
        
    except Exception as e:
        print(f"Error compiling system state: {e}")
    
    return state


@router.get("/models/list")
async def list_available_models():
    """List available OpenRouter models for debugging."""
    try:
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        }
        response = requests.get("https://openrouter.ai/api/v1/models", headers=headers, timeout=10)
        if response.status_code == 200:
            models_data = response.json()
            return {
                "available_models": models_data.get("data", []),
                "count": len(models_data.get("data", [])),
                "provider": "OpenRouter"
            }
        else:
            return {
                "error": f"Failed to fetch models: {response.status_code}",
                "available_models": [],
                "suggestion": "Using default model: " + DEFAULT_MODEL
            }
    except Exception as e:
        return {
            "error": str(e),
            "available_models": [],
            "default_model": DEFAULT_MODEL,
            "suggestion": "OpenRouter provides access to multiple LLM providers"
        }


@router.get("/recommendations")
async def get_ai_recommendations(request: Request, city_id: Optional[str] = Query(None)):
    """Get AI-powered recommendations based on all ML model outputs."""
    try:
        # Get mode from request
        mode = _get_mode(request)
        # Compile current system state with mode and city_id
        system_state = compile_system_state(mode=mode, city_id=city_id)
        
        if "error" in system_state:
            return {"error": system_state["error"], "recommendations": []}
        if not (OPENROUTER_API_KEY and OPENROUTER_API_KEY.strip()) and not (MISTRAL_API_KEY and MISTRAL_API_KEY.strip()):
            return {
                "error": "No AI API key set. Set OPENROUTER_API_KEY or MISTRAL_API_KEY in .env (or in Docker env) and restart the backend.",
                "recommendations": [],
                "suggestion": "Get OpenRouter at https://openrouter.ai or Mistral at https://console.mistral.ai and add the key to .env"
            }
        
        # Prepare prompt for OpenRouter LLM
        user_prompt = f"""
Analyze the current system state and provide actionable recommendations.

CURRENT SYSTEM STATE:
{json.dumps(system_state, indent=2)}

Based on this data, provide 5-10 prioritized recommendations. Consider:
- Which zones are at highest risk?
- What do the ML models predict?
- Are there anomalies that need attention?
- What actions will balance demand, emissions, and reliability?
- If "costs" is present (energy_usd, co2_usd, aqi_usd, incident_usd, total_usd, price_per_kwh, incident_count): use it to inform cost_estimate (e.g. "~$X savings", "Low/Medium/High cost", AQI/311 incident impact).

Return recommendations as a JSON array with this structure:
[
  {{
    "priority": 10,
    "action_type": "load_balancing",
    "title": "Short action title",
    "description": "Detailed explanation of the action and why it's needed",
    "affected_zones": ["Z_001", "Z_002"],
    "expected_impact": "What will happen if this action is taken - be specific about energy savings, risk reduction, cost implications",
    "confidence": 0.85,
    "cost_estimate": "Low/Medium/High or specific amount with reasoning",
    "suggested_simulation": "heatwave_scenario for Zone 5",
    "urgency": "immediate/high/medium/low",
    "implementation_steps": ["Step 1: Describe first action", "Step 2: Describe second action", "Step 3: Describe third action"],
    "risks": "Potential risks or side effects of implementing this recommendation",
    "timeline": "Estimated time to implement (e.g., '2-4 hours', '1-2 days', '1 week')",
    "ml_models_used": "Which ML models contributed to this recommendation (e.g., 'TFT demand forecast, GNN risk assessment')",
    "data_sources": "Key data sources that informed this recommendation (e.g., 'Recent demand spikes, AQI violations, anomaly detections')"
  }}
]

Only return valid JSON, no additional text.
"""
        
        # Call OpenRouter first; on failure, fall back to Mistral (both use OpenAI-compatible chat format)
        payload = {
            "model": DEFAULT_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": min(OPENROUTER_MAX_TOKENS, 2048),
            "top_p": 0.9
        }
        
        response_text = None
        last_error = None
        used_fallback = False

        def _call_openrouter():
            h = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://urbangrid.system",
                "X-Title": "Urban Grid Management System"
            }
            r = requests.post(OPENROUTER_API_URL, headers=h, json=payload, timeout=30)
            if r.status_code != 200:
                err = r.text
                try:
                    err = r.json().get('error', {}).get('message', err)
                except Exception:
                    pass
                if r.status_code == 402:
                    err = "Insufficient credits (402). Add credits at https://openrouter.ai/settings/credits or use Mistral fallback."
                raise Exception(f"OpenRouter {r.status_code}: {err}")
            data = r.json()
            if 'choices' in data and len(data['choices']) > 0:
                return data['choices'][0]['message']['content']
            raise Exception(f"No choices in response: {data}")

        def _call_mistral():
            h = {
                "Authorization": f"Bearer {MISTRAL_API_KEY}",
                "Content-Type": "application/json"
            }
            mistral_payload = {
                "model": MISTRAL_MODEL,
                "messages": payload["messages"],
                "temperature": payload["temperature"],
                "max_tokens": payload["max_tokens"]
            }
            r = requests.post(MISTRAL_API_URL, headers=h, json=mistral_payload, timeout=30)
            if r.status_code != 200:
                err = r.text
                try:
                    err = r.json().get('message', r.json().get('error', err))
                except Exception:
                    pass
                raise Exception(f"Mistral {r.status_code}: {err}")
            data = r.json()
            if 'choices' in data and len(data['choices']) > 0:
                return data['choices'][0]['message']['content']
            raise Exception(f"No choices in response: {data}")

        # Try OpenRouter first (if key set), then Mistral fallback
        if OPENROUTER_API_KEY and OPENROUTER_API_KEY.strip():
            try:
                response_text = _call_openrouter()
            except Exception as e:
                last_error = str(e)
                print(f"OpenRouter API error: {last_error}")
        if response_text is None and MISTRAL_API_KEY and MISTRAL_API_KEY.strip():
            try:
                response_text = _call_mistral()
                used_fallback = True
            except Exception as e:
                last_error = str(e)
                print(f"Mistral fallback error: {last_error}")

        if response_text is None:
            suggestion = "Check OPENROUTER_API_KEY and MISTRAL_API_KEY in .env. If OpenRouter returns 402, add credits or rely on Mistral."
            return {
                "error": f"AI API error: {last_error or 'No provider available'}",
                "recommendations": [],
                "suggestion": suggestion
            }
        
        # Parse response
        response_text = response_text.strip()
        
        # Try to extract JSON from response (LLM may wrap in text or markdown)
        try:
            # Remove markdown code blocks if present
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            # If there is still leading/trailing text, extract JSON array or object
            text = response_text
            if not text.startswith("[") and not text.startswith("{"):
                start = text.find("[")
                if start == -1:
                    start = text.find("{")
                if start != -1:
                    end = (text.rfind("]") + 1) if text[start] == "[" else (text.rfind("}") + 1)
                    if end > start:
                        text = text[start:end]
            
            # Try to fix truncated JSON (common with token limits)
            def try_fix_truncated_json(json_str):
                """Attempt to fix truncated JSON by closing open brackets/braces."""
                if not json_str:
                    return json_str
                # Count brackets
                open_brackets = json_str.count('[') - json_str.count(']')
                open_braces = json_str.count('{') - json_str.count('}')
                
                # If truncated, try to close it
                if open_brackets > 0 or open_braces > 0:
                    # Find the last complete object in an array
                    if json_str.startswith('['):
                        # Find last complete object (ends with })
                        last_complete = json_str.rfind('}')
                        if last_complete > 0:
                            # Check if there's a comma after it
                            after = json_str[last_complete+1:].strip()
                            if after.startswith(',') or after == '':
                                # Truncate to last complete object and close array
                                return json_str[:last_complete+1] + ']'
                    # Generic fix: close remaining brackets/braces
                    fixed = json_str
                    fixed += '}' * open_braces
                    fixed += ']' * open_brackets
                    return fixed
                return json_str
            
            # First try parsing as-is
            try:
                recommendations = json.loads(text)
            except json.JSONDecodeError:
                # Try fixing truncated JSON
                fixed_text = try_fix_truncated_json(text)
                recommendations = json.loads(fixed_text)
            
            # Ensure it's a list
            if isinstance(recommendations, dict) and "recommendations" in recommendations:
                recommendations = recommendations["recommendations"]
            elif not isinstance(recommendations, list):
                recommendations = [recommendations]
            
            out = {
                "recommendations": recommendations,
                "system_state": system_state,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            if used_fallback:
                out["provider"] = "mistral"
            return out
        except json.JSONDecodeError as e:
            # If JSON parsing fails, return the raw response with error
            return {
                "error": "Failed to parse AI response as JSON",
                "raw_response": response_text,
                "recommendations": []
            }
    
    except Exception as e:
        return {
            "error": str(e),
            "recommendations": []
        }


@router.get("/system-state")
async def get_system_state():
    """Get compiled system state (all ML outputs, alerts, etc.)"""
    return compile_system_state()
