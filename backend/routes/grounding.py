"""
Phase 2b: Grounding DB + synthetic events (for Scenario Console).
Collections: asset_registry, active_events, service_outages, playbooks.
Backend APIs so domain-specific AI can query these; synthetic event generator for testing.
"""
from __future__ import annotations

import random
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.db.mongo_client import get_city_db

router = APIRouter(prefix="/api/grounding", tags=["Grounding (Phase 2b)"])


def _clean(obj: Any, depth: int = 0, max_depth: int = 20) -> Any:
    """Recursively convert ObjectId/datetime for JSON."""
    if depth > max_depth:
        return str(obj) if obj is not None else None
    from bson import ObjectId
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


def _ensure_playbooks(db) -> None:
    """Seed playbooks if collection is empty (Phase 2b)."""
    if db is None:
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


@router.get("/asset-registry")
async def get_asset_registry(
    city_id: Optional[str] = Query(None),
    zone_id: Optional[str] = Query(None),
    asset_type: Optional[str] = Query(None, description="transformer|substation|feeder|water_pump|zone"),
    limit: int = Query(200, ge=1, le=500),
):
    """Phase 2b: List assets (transformers, substations, feeders, zones). Domain AI uses this for evidence."""
    db = get_city_db()
    if db is None:
        return {"assets": [], "count": 0, "error": "Database unavailable"}
    q: Dict[str, Any] = {}
    if city_id:
        q["city_id"] = city_id.strip().lower()
    if zone_id:
        q["zone_id"] = zone_id
    if asset_type:
        q["type"] = asset_type
    cursor = db.asset_registry.find(q).limit(limit)
    assets = [_clean(d) for d in cursor]
    return {"assets": assets, "count": len(assets)}


@router.get("/active-events")
async def get_active_events(
    city_id: Optional[str] = Query(None),
    zone_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None, description="outage|failure|aqi_spike|road_closure"),
    limit: int = Query(100, ge=1, le=300),
):
    """Phase 2b: List active events (outages, failures, AQI spikes, road closures). Domain AI uses this for evidence."""
    db = get_city_db()
    if db is None:
        return {"events": [], "count": 0, "error": "Database unavailable"}
    q: Dict[str, Any] = {}
    if city_id:
        q["city_id"] = city_id.strip().lower()
    if zone_id:
        q["zone_id"] = zone_id
    if event_type:
        q["type"] = event_type
    cursor = db.active_events.find(q).sort("ts", -1).limit(limit)
    events = [_clean(d) for d in cursor]
    return {"events": events, "count": len(events)}


@router.get("/service-outages")
async def get_service_outages(
    city_id: Optional[str] = Query(None),
    zone_id: Optional[str] = Query(None),
    service_type: Optional[str] = Query(None, description="power|water"),
    limit: int = Query(100, ge=1, le=300),
):
    """Phase 2b: List service outages (power/water by zone: %% affected, start_ts, eta). Domain AI uses this."""
    db = get_city_db()
    if db is None:
        return {"outages": [], "count": 0, "error": "Database unavailable"}
    q: Dict[str, Any] = {}
    if city_id:
        q["city_id"] = city_id.strip().lower()
    if zone_id:
        q["zone_id"] = zone_id
    if service_type:
        q["service_type"] = service_type
    cursor = db.service_outages.find(q).sort("start_ts", -1).limit(limit)
    outages = [_clean(d) for d in cursor]
    return {"outages": outages, "count": len(outages)}


@router.get("/playbooks")
async def get_playbooks(
    event_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    """Phase 2b: List playbooks (allowed actions + ETA/cost per event type). Domain AI uses this for recommended actions."""
    db = get_city_db()
    if db is None:
        return {"playbooks": [], "count": 0, "error": "Database unavailable"}
    _ensure_playbooks(db)
    q: Dict[str, Any] = {}
    if event_type:
        q["event_type"] = event_type
    cursor = db.playbooks.find(q).limit(limit)
    playbooks = [_clean(d) for d in cursor]
    return {"playbooks": playbooks, "count": len(playbooks)}


# --- Synthetic event generator (testing only) ---

EVENT_TYPES = ["outage", "failure", "aqi_spike", "road_closure"]
ZONE_IDS = [f"Z_{str(i).zfill(3)}" for i in range(1, 21)]


@router.post("/synthetic-events")
async def generate_synthetic_events(
    city_id: Optional[str] = Query("nyc"),
    count: int = Query(5, ge=1, le=20),
    event_types: Optional[str] = Query(None, description="Comma-separated: outage,failure,aqi_spike,road_closure"),
):
    """
    Phase 2b: Generate synthetic events for testing Scenario Console only.
    Writes into active_events (and optionally service_outages). Does not affect Analytics/Data pages.
    """
    db = get_city_db()
    if db is None:
        return {"created": 0, "error": "Database unavailable"}
    cid = (city_id or "nyc").strip().lower()
    types_list = [t.strip() for t in (event_types or "outage,failure,aqi_spike,road_closure").split(",") if t.strip()]
    if not types_list:
        types_list = EVENT_TYPES
    created = 0
    now = datetime.now(timezone.utc)
    for _ in range(count):
        etype = random.choice(types_list)
        zone_id = random.choice(ZONE_IDS)
        event_id = f"evt_{cid}_{zone_id}_{now.strftime('%Y%m%d%H%M%S')}_{random.randint(1000, 9999)}"
        severity = random.choice(["low", "medium", "high"])
        doc = {
            "event_id": event_id,
            "type": etype,
            "zone_id": zone_id,
            "city_id": cid,
            "ts": now.isoformat(),
            "description": f"Synthetic {etype} in {zone_id} (testing)",
            "severity": severity,
            "source": "synthetic_generator",
        }
        try:
            db.active_events.insert_one(doc)
            created += 1
        except Exception:
            pass
        # Optionally add service_outages for outage/failure
        if etype in ("outage", "failure") and random.random() < 0.5:
            try:
                db.service_outages.insert_one({
                    "zone_id": zone_id,
                    "city_id": cid,
                    "service_type": "power",
                    "pct_affected": round(random.uniform(10, 80), 1),
                    "start_ts": now.isoformat(),
                    "eta_ts": (now + timedelta(minutes=random.randint(30, 120))).isoformat(),
                    "event_id": event_id,
                    "source": "synthetic_generator",
                })
            except Exception:
                pass
    return {"created": created, "city_id": cid, "message": f"Inserted {created} synthetic events into active_events (and optionally service_outages)."}
