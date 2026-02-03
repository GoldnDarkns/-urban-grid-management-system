"""
Phase 2c: Domain-specific AI orchestrator.
Rules + tool calls (city state, active_events, service_outages, playbooks).
Evidence-first; no general-purpose LLM for core decisions.
Outputs: scenario_result, assistant_reply (templates), trace.
"""
from __future__ import annotations

import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.db.mongo_client import get_city_db


# --- Intent classification (rule-based) ---
INTENT_KEYWORDS = {
    "power_outage": ["power", "outage", "blackout", "no power", "no electricity", "power cut", "lights out", "have no power", "lost power"],
    "aqi_spike": ["aqi", "air quality", "pollution", "smog", "pm2.5", "pm10", "breathing"],
    "road_closure": ["road", "closure", "traffic", "blocked", "detour", "congestion"],
    "failure": ["failure", "failed", "equipment", "transformer", "substation", "fault", "broken"],
}
DEFAULT_INTENT = "general"

# Map intent to playbook event_type (playbooks use "outage" not "power_outage")
INTENT_TO_PLAYBOOK_EVENT = {
    "power_outage": "outage",
    "aqi_spike": "aqi_spike",
    "road_closure": "road_closure",
    "failure": "failure",
}


def classify_intent(text: str) -> str:
    """Rule-based intent from user message. Returns power_outage | aqi_spike | road_closure | failure | general."""
    if not text or not isinstance(text, str):
        return DEFAULT_INTENT
    lower = text.strip().lower()
    for intent, keywords in INTENT_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return intent
    return DEFAULT_INTENT


# --- Tools: fetch from MongoDB (same DB as grounding / city_selection) ---
def _clean(obj: Any, depth: int = 0, max_depth: int = 20) -> Any:
    from bson import ObjectId
    if depth > max_depth:
        return str(obj) if obj is not None else None
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, dict):
        return {k: _clean(v, depth + 1, max_depth) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_clean(x, depth + 1, max_depth) for x in obj]
    if hasattr(obj, "isoformat") and callable(getattr(obj, "isoformat")):
        try:
            return obj.isoformat()
        except Exception:
            return str(obj)
    return obj


def fetch_city_state(db, city_id: str, zones_limit: int = 50, alerts_limit: int = 30) -> Dict[str, Any]:
    """Minimal city state for orchestrator: zones (zone_id, risk, etc.) and alerts."""
    if not db or not city_id:
        return {"city_id": city_id, "zones": [], "alerts": [], "grid": {"zone_count": 0, "high_risk_count": 0, "high_resilience_count": 0, "alert_count": 0}}
    city_id = city_id.strip().lower()
    try:
        cursor = db.processed_zone_data.find({"city_id": city_id}).sort("timestamp", -1).limit(zones_limit * 2)
        by_zone = {}
        for doc in cursor:
            zid = doc.get("zone_id")
            if zid and zid not in by_zone:
                by_zone[zid] = doc
            if len(by_zone) >= zones_limit:
                break
        zones_list = []
        high_risk_count = 0
        high_resilience_count = 0
        for zid, doc in list(by_zone.items())[:zones_limit]:
            raw = doc.get("raw_data") or {}
            ml = doc.get("ml_processed") or {}
            risk = ml.get("risk_score") or {}
            level = (risk.get("level") or "").lower()
            if level == "high":
                high_risk_count += 1
            resilience = ml.get("resilience_score") or {}
            if (resilience.get("level") or "").lower() == "high":
                high_resilience_count += 1
            zones_list.append(_clean({
                "zone_id": zid,
                "timestamp": doc.get("timestamp"),
                "aqi": (raw.get("aqi") or {}).get("aqi"),
                "risk_score": risk,
                "resilience_score": resilience,
                "recommendations_count": len(doc.get("recommendations") or []),
            }))
        alerts_cursor = db.alerts.find({"city_id": city_id}).sort("ts", -1).limit(alerts_limit)
        alerts_list = [_clean({"zone_id": a.get("zone_id"), "ts": a.get("ts"), "level": a.get("level"), "type": a.get("type"), "message": a.get("message")}) for a in alerts_cursor]
        return {
            "city_id": city_id,
            "zones": zones_list,
            "alerts": alerts_list,
            "grid": {"zone_count": len(zones_list), "high_risk_count": high_risk_count, "high_resilience_count": high_resilience_count, "alert_count": len(alerts_list)},
        }
    except Exception:
        return {"city_id": city_id, "zones": [], "alerts": [], "grid": {"zone_count": 0, "high_risk_count": 0, "high_resilience_count": 0, "alert_count": 0}}


def fetch_active_events(db, city_id: str, zone_id: Optional[str] = None, event_type: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    if not db:
        return []
    q = {"city_id": city_id.strip().lower()}
    if zone_id:
        q["zone_id"] = zone_id
    if event_type:
        q["type"] = event_type
    cursor = db.active_events.find(q).sort("ts", -1).limit(limit)
    return [_clean(d) for d in cursor]


def fetch_service_outages(db, city_id: str, zone_id: Optional[str] = None, limit: int = 30) -> List[Dict[str, Any]]:
    if not db:
        return []
    q = {"city_id": city_id.strip().lower()}
    if zone_id:
        q["zone_id"] = zone_id
    cursor = db.service_outages.find(q).sort("start_ts", -1).limit(limit)
    return [_clean(d) for d in cursor]


def _seed_playbooks_if_empty(db) -> None:
    """Seed playbooks for Phase 2b compatibility (same defaults as grounding router)."""
    if not db:
        return
    try:
        if db.playbooks.count_documents({}) > 0:
            return
        defaults = [
            {"event_type": "outage", "action_id": "dispatch_crew", "name": "Dispatch crew", "description": "Send crew to assess and restore", "eta_minutes": 60, "cost_estimate": 500},
            {"event_type": "outage", "action_id": "load_shed_zone", "name": "Load shed zone", "description": "Shed load in affected zone", "eta_minutes": 15, "cost_estimate": 0},
            {"event_type": "aqi_spike", "action_id": "notify_public", "name": "Notify public", "description": "Issue AQI advisory", "eta_minutes": 5, "cost_estimate": 0},
            {"event_type": "aqi_spike", "action_id": "reduce_industrial", "name": "Reduce industrial", "description": "Request industrial load reduction", "eta_minutes": 120, "cost_estimate": 2000},
            {"event_type": "road_closure", "action_id": "reroute_crews", "name": "Reroute crews", "description": "Reroute maintenance crews", "eta_minutes": 30, "cost_estimate": 100},
            {"event_type": "failure", "action_id": "isolate_asset", "name": "Isolate asset", "description": "Isolate failed asset and switch backup", "eta_minutes": 45, "cost_estimate": 300},
        ]
        db.playbooks.insert_many(defaults)
    except Exception:
        pass


def fetch_playbooks(db, event_type: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
    if not db:
        return []
    _seed_playbooks_if_empty(db)
    q = {}
    if event_type:
        q["event_type"] = event_type
    cursor = db.playbooks.find(q).limit(limit)
    return [_clean(d) for d in cursor]


def fetch_asset_registry(db, city_id: str, zone_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    if not db:
        return []
    q = {"city_id": city_id.strip().lower()}
    if zone_id:
        q["zone_id"] = zone_id
    cursor = db.asset_registry.find(q).limit(limit)
    return [_clean(d) for d in cursor]


# --- Orchestrator run ---
MAX_CLARIFYING = 3


def run(
    session_id: str,
    city_id: Optional[str],
    zone_id: Optional[str],
    message: str,
    session_state: Dict[str, Any],
) -> Tuple[Dict[str, Any], str, List[Dict[str, Any]]]:
    """
    Run one orchestrator turn. Returns (scenario_result, assistant_reply, trace).
    session_state: clarifying_count, last_intent, resolved_zone_id (optional), message_history (optional).
    """
    trace = []
    t0 = time.perf_counter()

    # 1) Intent
    intent = classify_intent(message)
    trace.append({"step": "intent_classification", "intent": intent, "user_message_preview": (message or "")[:200]})

    clarifying_count = session_state.get("clarifying_count", 0)
    resolved_zone = zone_id or session_state.get("resolved_zone_id")

    # 2) Need zone? Ask clarifying (max 3)
    intent_needs_zone = intent in ("power_outage", "aqi_spike", "road_closure", "failure")
    if intent_needs_zone and city_id and not resolved_zone and clarifying_count < MAX_CLARIFYING:
        db = get_city_db()
        state = fetch_city_state(db, city_id, zones_limit=30, alerts_limit=20) if db else {"zones": []}
        zone_ids = [z.get("zone_id") for z in (state.get("zones") or []) if z.get("zone_id")]
        if zone_ids:
            reply = f"I see you're asking about a {intent.replace('_', ' ')}. Which zone should I focus on? You can say one of: {', '.join(zone_ids[:10])}{'...' if len(zone_ids) > 10 else ''}."
            scenario_result = {
                "affected_zones": [],
                "hypotheses": [],
                "evidence_ids": [],
                "recommended_actions": [],
                "clarifying_question": True,
                "clarifying_count": clarifying_count + 1,
                "message": "Awaiting zone selection",
            }
            trace.append({"step": "clarifying_question", "question_preview": reply[:150]})
            return scenario_result, reply, trace

    # 3) Tool calls
    db = get_city_db()
    city_id_normalized = (city_id or "").strip().lower() or None
    tool_results = {}
    if db and city_id_normalized:
        t1 = time.perf_counter()
        tool_results["city_state"] = fetch_city_state(db, city_id_normalized, zones_limit=50, alerts_limit=30)
        trace.append({"step": "tool_call", "tool": "city_state", "city_id": city_id_normalized, "duration_ms": round((time.perf_counter() - t1) * 1000)})
        t2 = time.perf_counter()
        tool_results["active_events"] = fetch_active_events(db, city_id_normalized, resolved_zone, event_type=intent if intent != "general" else None, limit=30)
        trace.append({"step": "tool_call", "tool": "active_events", "zone_id": resolved_zone, "event_type": intent if intent != "general" else None, "count": len(tool_results["active_events"]), "duration_ms": round((time.perf_counter() - t2) * 1000)})
        t3 = time.perf_counter()
        tool_results["service_outages"] = fetch_service_outages(db, city_id_normalized, resolved_zone, limit=20)
        trace.append({"step": "tool_call", "tool": "service_outages", "count": len(tool_results["service_outages"]), "duration_ms": round((time.perf_counter() - t3) * 1000)})
        t4 = time.perf_counter()
        playbook_event = INTENT_TO_PLAYBOOK_EVENT.get(intent) if intent != "general" else None
        tool_results["playbooks"] = fetch_playbooks(db, event_type=playbook_event, limit=20)
        trace.append({"step": "tool_call", "tool": "playbooks", "event_type": playbook_event, "count": len(tool_results["playbooks"]), "duration_ms": round((time.perf_counter() - t4) * 1000)})
    else:
        tool_results["city_state"] = {"zones": [], "alerts": [], "grid": {"zone_count": 0, "high_risk_count": 0, "high_resilience_count": 0, "alert_count": 0}}
        tool_results["active_events"] = []
        tool_results["service_outages"] = []
        tool_results["playbooks"] = []

    # 4) Evidence-first: build scenario_result from tool results
    events = tool_results.get("active_events") or []
    outages = tool_results.get("service_outages") or []
    playbooks = tool_results.get("playbooks") or []
    state = tool_results.get("city_state") or {}
    zones = state.get("zones") or []
    alerts = state.get("alerts") or []

    evidence_ids = []
    for e in events:
        if e.get("event_id"):
            evidence_ids.append(e["event_id"])
    for o in outages:
        if o.get("event_id") and o["event_id"] not in evidence_ids:
            evidence_ids.append(o["event_id"])

    affected_zones = list({e.get("zone_id") for e in events if e.get("zone_id")} | {o.get("zone_id") for o in outages if o.get("zone_id")})
    if not affected_zones and resolved_zone:
        affected_zones = [resolved_zone]
    if not affected_zones and zones:
        high_risk = [z.get("zone_id") for z in zones if (z.get("risk_score") or {}).get("level") == "high"]
        affected_zones = high_risk[:5] if high_risk else [z.get("zone_id") for z in zones[:5] if z.get("zone_id")]

    recommended_actions = []
    for pb in playbooks:
        recommended_actions.append({
            "action_id": pb.get("action_id"),
            "name": pb.get("name"),
            "description": pb.get("description"),
            "eta_minutes": pb.get("eta_minutes"),
            "cost_estimate": pb.get("cost_estimate"),
            "event_type": pb.get("event_type"),
        })

    hypotheses = []
    if events or outages:
        hypotheses.append({
            "summary": f"Found {len(events)} active event(s) and {len(outages)} service outage(s) for the selected scope.",
            "confidence": 0.9 if evidence_ids else 0.5,
            "evidence_ids": evidence_ids[:10],
        })
    elif not city_id_normalized:
        hypotheses.append({"summary": "No city selected. Provide city_id for evidence-based results.", "confidence": 0.0, "evidence_ids": []})
    else:
        hypotheses.append({"summary": "No matching events or outages in grounding data for this scope. City state and alerts may still indicate risk.", "confidence": 0.6, "evidence_ids": []})

    scenario_result = {
        "affected_zones": affected_zones[:20],
        "hypotheses": hypotheses,
        "evidence_ids": evidence_ids[:20],
        "recommended_actions": recommended_actions[:10],
        "grid": state.get("grid"),
        "alerts_count": len(alerts),
        "clarifying_question": False,
        "message": "Processed with evidence from grounding and city state.",
    }

    # 5) Template reply — always return a helpful message
    if not city_id_normalized:
        assistant_reply = "I don't have a city selected. Please select a city (or provide city_id) so I can look up events, outages, and playbooks for your area."
    elif evidence_ids or recommended_actions:
        parts = []
        if events or outages:
            parts.append(f"I found {len(events)} active event(s) and {len(outages)} service outage(s) for the selected scope.")
        if evidence_ids:
            parts.append(f"Evidence IDs: {', '.join(evidence_ids[:5])}{'...' if len(evidence_ids) > 5 else ''}.")
        if recommended_actions:
            first = recommended_actions[0]
            parts.append(f"Recommended action: **{first.get('name', 'N/A')}** — {first.get('description', '')} (ETA: {first.get('eta_minutes')} min, cost: {first.get('cost_estimate')}).")
            if len(recommended_actions) > 1:
                parts.append(f"Other options: {', '.join(a.get('name', '') for a in recommended_actions[1:3])}.")
        assistant_reply = " ".join(parts) if parts else "Processed your scenario. See the Scenario result panel for details."
    else:
        # No events/outages in DB but we have city — still show intent-specific guidance
        intent_label = intent.replace("_", " ") if intent != "general" else "this"
        assistant_reply = (
            f"For {city_id_normalized}" + (f" zone {resolved_zone}" if resolved_zone else " (city-wide)")
            + f", I didn't find any recorded {intent_label} events in the grounding data. "
            + "Check the Scenario result panel for affected zones from city state and alerts. "
            + "You can add test events via POST /api/grounding/synthetic-events to see full playbook actions."
        )

    trace.append({"step": "build_output", "scenario_result_keys": list(scenario_result.keys()), "duration_ms": round((time.perf_counter() - t0) * 1000)})
    return scenario_result, assistant_reply, trace
