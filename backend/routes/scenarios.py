"""
Phase 3a: Scenario bank & evaluation.
Store scenarios, run against the agent, record outcome (pass/fail/score).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.services.agent_orchestrator import run as orchestrator_run
from src.db.mongo_client import get_city_db
from bson import ObjectId

router = APIRouter(prefix="/api/scenarios", tags=["Scenario Bank (Phase 3a)"])


def _clean_for_json(obj, depth=0, max_d=20):
    if depth > max_d:
        return str(obj) if obj is not None else None
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, dict):
        return {k: _clean_for_json(v, depth + 1, max_d) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_clean_for_json(x, depth + 1, max_d) for x in obj]
    if hasattr(obj, "isoformat") and callable(getattr(obj, "isoformat")):
        try:
            return obj.isoformat()
        except Exception:
            return str(obj)
    return obj


# --- Pydantic models ---

class ScenarioCreate(BaseModel):
    name: str = Field(..., min_length=1, description="Scenario name")
    description: Optional[str] = None
    input_message: str = Field(..., min_length=1, description="Message to send to the agent (e.g. 'I have no power')")
    city_id: Optional[str] = None
    expected_outcome: Optional[Any] = None  # string "should mention outage" or dict {"contains": "outage", "has_actions": True}


class ScenarioUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = None
    input_message: Optional[str] = Field(None, min_length=1)
    city_id: Optional[str] = None
    expected_outcome: Optional[Any] = None


class RunBatchBody(BaseModel):
    scenario_ids: Optional[List[str]] = None  # if None, run all
    city_id: Optional[str] = None


# --- Evaluation: compare response to expected_outcome ---

def _evaluate(assistant_reply: str, scenario_result: Dict[str, Any], expected_outcome: Any) -> tuple[str, Optional[float], str]:
    """
    Returns (outcome, score, notes).
    outcome: "pass" | "fail" | "unknown"
    score: 0.0-1.0 or None
    notes: short explanation
    """
    reply_lower = (assistant_reply or "").lower()
    actions = (scenario_result or {}).get("recommended_actions") or []
    has_actions = len(actions) > 0

    if expected_outcome is None:
        return "unknown", None, "No expected outcome defined"

    if isinstance(expected_outcome, str):
        expected_lower = expected_outcome.strip().lower()
        if not expected_lower:
            return "unknown", None, "Empty expected outcome"
        if expected_lower in reply_lower:
            return "pass", 1.0, f"Reply contains expected text: '{expected_outcome[:50]}...'"
        return "fail", 0.0, f"Reply did not contain expected text: '{expected_outcome[:50]}...'"

    if isinstance(expected_outcome, dict):
        checks = []
        if "contains" in expected_outcome:
            want = str(expected_outcome["contains"]).lower()
            if want in reply_lower:
                checks.append(True)
            else:
                checks.append(False)
        if expected_outcome.get("has_actions") is True:
            checks.append(has_actions)
        if not checks:
            return "unknown", None, "Expected outcome dict had no checks"
        passed = sum(checks)
        total = len(checks)
        score = passed / total if total else 0.0
        outcome = "pass" if passed == total else "fail"
        return outcome, score, f"{passed}/{total} checks passed"

    return "unknown", None, "Unsupported expected_outcome format"


# --- CRUD ---

@router.get("")
async def list_scenarios(city_id: Optional[str] = Query(None, description="Filter by city_id (null = all)")):
    """List all scenarios, optionally filtered by city_id."""
    db = get_city_db()
    if db is None:
        return {"scenarios": [], "total": 0}
    q = {}
    if city_id is not None:
        q["city_id"] = city_id.strip().lower()
    cursor = db.scenarios.find(q).sort("created_at", -1).limit(100)
    scenarios = []
    for doc in cursor:
        scenarios.append({
            "id": str(doc["_id"]),
            "name": doc.get("name", ""),
            "description": doc.get("description"),
            "input_message": doc.get("input_message", ""),
            "city_id": doc.get("city_id"),
            "expected_outcome": _clean_for_json(doc.get("expected_outcome")),
            "created_at": doc.get("created_at").isoformat() if hasattr(doc.get("created_at"), "isoformat") else str(doc.get("created_at")),
            "last_run_outcome": doc.get("last_run_outcome"),
            "last_run_at": doc.get("last_run_at").isoformat() if doc.get("last_run_at") and hasattr(doc.get("last_run_at"), "isoformat") else str(doc.get("last_run_at")) if doc.get("last_run_at") else None,
        })
    return {"scenarios": scenarios, "total": len(scenarios)}


@router.post("")
async def create_scenario(body: ScenarioCreate):
    """Create a new scenario."""
    db = get_city_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    now = datetime.now(timezone.utc)
    doc = {
        "name": body.name.strip(),
        "description": (body.description or "").strip() or None,
        "input_message": body.input_message.strip(),
        "city_id": (body.city_id or "").strip().lower() or None,
        "expected_outcome": body.expected_outcome,
        "created_at": now,
        "updated_at": now,
        "last_run_outcome": None,
        "last_run_at": None,
    }
    result = db.scenarios.insert_one(doc)
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k not in ("created_at", "updated_at")}}


@router.get("/{scenario_id}")
async def get_scenario(scenario_id: str):
    """Get one scenario by ID."""
    db = get_city_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    try:
        oid = ObjectId(scenario_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid scenario ID")
    doc = db.scenarios.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return _clean_for_json({
        "id": str(doc["_id"]),
        "name": doc.get("name"),
        "description": doc.get("description"),
        "input_message": doc.get("input_message"),
        "city_id": doc.get("city_id"),
        "expected_outcome": doc.get("expected_outcome"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
        "last_run_outcome": doc.get("last_run_outcome"),
        "last_run_at": doc.get("last_run_at"),
    })


@router.put("/{scenario_id}")
async def update_scenario(scenario_id: str, body: ScenarioUpdate):
    """Update a scenario."""
    db = get_city_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    try:
        oid = ObjectId(scenario_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid scenario ID")
    updates = {"updated_at": datetime.now(timezone.utc)}
    if body.name is not None:
        updates["name"] = body.name.strip()
    if body.description is not None:
        updates["description"] = body.description.strip() or None
    if body.input_message is not None:
        updates["input_message"] = body.input_message.strip()
    if body.city_id is not None:
        updates["city_id"] = body.city_id.strip().lower() or None
    if body.expected_outcome is not None:
        updates["expected_outcome"] = body.expected_outcome
    result = db.scenarios.update_one({"_id": oid}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return {"ok": True}


@router.delete("/{scenario_id}")
async def delete_scenario(scenario_id: str):
    """Delete a scenario."""
    db = get_city_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    try:
        oid = ObjectId(scenario_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid scenario ID")
    result = db.scenarios.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return {"ok": True}


# --- Run single scenario ---

@router.post("/{scenario_id}/run")
async def run_scenario(
    scenario_id: str,
    city_id: Optional[str] = Query(None, description="Override city for this run"),
):
    """
    Run one scenario: send input_message to the agent, evaluate against expected_outcome, store run, return outcome.
    """
    db = get_city_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    try:
        oid = ObjectId(scenario_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid scenario ID")
    scenario = db.scenarios.find_one({"_id": oid})
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    input_message = (scenario.get("input_message") or "").strip()
    if not input_message:
        raise HTTPException(status_code=400, detail="Scenario has no input_message")

    run_city_id = (city_id or scenario.get("city_id") or "").strip().lower() or None

    # Temporary session state for orchestrator
    session_id = str(uuid.uuid4())
    session_state = {
        "city_id": run_city_id,
        "zone_id": None,
        "clarifying_count": 0,
        "message_history": [],
    }

    scenario_result, assistant_reply, trace = orchestrator_run(
        session_id=session_id,
        city_id=run_city_id,
        zone_id=None,
        message=input_message,
        session_state=session_state,
    )

    expected = scenario.get("expected_outcome")
    outcome, score, notes = _evaluate(assistant_reply, scenario_result, expected)

    run_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    run_doc = {
        "run_id": run_id,
        "scenario_id": scenario_id,
        "scenario_name": scenario.get("name"),
        "city_id": run_city_id,
        "input_used": input_message[:2000],
        "assistant_reply": (assistant_reply or "")[:2000],
        "scenario_result_summary": {
            "affected_zones": (scenario_result or {}).get("affected_zones", [])[:20],
            "recommended_actions_count": len((scenario_result or {}).get("recommended_actions") or []),
        },
        "outcome": outcome,
        "score": score,
        "evaluation_notes": notes,
        "created_at": now,
    }
    try:
        db.scenario_runs.insert_one(run_doc)
    except Exception:
        pass

    try:
        db.scenarios.update_one(
            {"_id": oid},
            {"$set": {"last_run_outcome": outcome, "last_run_at": now, "updated_at": now}},
        )
    except Exception:
        pass

    return _clean_for_json({
        "run_id": run_id,
        "scenario_id": scenario_id,
        "scenario_name": scenario.get("name"),
        "outcome": outcome,
        "score": score,
        "evaluation_notes": notes,
        "assistant_reply_preview": (assistant_reply or "")[:300],
    })


# --- Batch run ---

@router.post("/run-batch")
async def run_batch(body: RunBatchBody = None):
    """
    Run multiple scenarios. If scenario_ids is omitted, run all. Optionally override city_id for all.
    """
    db = get_city_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    body = body or RunBatchBody()
    ids = body.scenario_ids
    city_override = (body.city_id or "").strip().lower() or None

    if ids:
        try:
            oids = [ObjectId(sid) for sid in ids]
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid scenario_id in list")
        cursor = db.scenarios.find({"_id": {"$in": oids}})
    else:
        cursor = db.scenarios.find({})

    scenarios = list(cursor)
    results = []
    for scenario in scenarios:
        sid = str(scenario["_id"])
        try:
            # Reuse run logic (inline to avoid HTTP)
            input_message = (scenario.get("input_message") or "").strip()
            if not input_message:
                results.append({"scenario_id": sid, "scenario_name": scenario.get("name"), "outcome": "fail", "score": None, "error": "No input_message"})
                continue
            run_city_id = city_override or (scenario.get("city_id") or "").strip().lower() or None
            session_id = str(uuid.uuid4())
            session_state = {"city_id": run_city_id, "zone_id": None, "clarifying_count": 0, "message_history": []}
            scenario_result, assistant_reply, trace = orchestrator_run(
                session_id=session_id, city_id=run_city_id, zone_id=None, message=input_message, session_state=session_state,
            )
            expected = scenario.get("expected_outcome")
            outcome, score, notes = _evaluate(assistant_reply, scenario_result, expected)
            now = datetime.now(timezone.utc)
            run_doc = {
                "run_id": str(uuid.uuid4()),
                "scenario_id": sid,
                "scenario_name": scenario.get("name"),
                "city_id": run_city_id,
                "input_used": input_message[:2000],
                "assistant_reply": (assistant_reply or "")[:2000],
                "scenario_result_summary": {"affected_zones": (scenario_result or {}).get("affected_zones", [])[:20], "recommended_actions_count": len((scenario_result or {}).get("recommended_actions") or [])},
                "outcome": outcome,
                "score": score,
                "evaluation_notes": notes,
                "created_at": now,
            }
            try:
                db.scenario_runs.insert_one(run_doc)
            except Exception:
                pass
            try:
                db.scenarios.update_one({"_id": scenario["_id"]}, {"$set": {"last_run_outcome": outcome, "last_run_at": now, "updated_at": now}})
            except Exception:
                pass
            results.append({"scenario_id": sid, "scenario_name": scenario.get("name"), "outcome": outcome, "score": score, "evaluation_notes": notes})
        except Exception as e:
            results.append({"scenario_id": sid, "scenario_name": scenario.get("name"), "outcome": "fail", "score": None, "error": str(e)[:200]})

    passed = sum(1 for r in results if r.get("outcome") == "pass")
    failed = sum(1 for r in results if r.get("outcome") == "fail")
    unknown = sum(1 for r in results if r.get("outcome") not in ("pass", "fail"))
    return _clean_for_json({
        "results": results,
        "summary": {"total": len(results), "pass": passed, "fail": failed, "unknown": unknown},
    })


@router.get("/runs/history")
async def list_scenario_runs(
    scenario_id: Optional[str] = Query(None),
    limit: int = Query(30, ge=1, le=100),
):
    """List recent scenario runs, optionally filtered by scenario_id."""
    db = get_city_db()
    if db is None:
        return {"runs": [], "total": 0}
    q = {}
    if scenario_id:
        q["scenario_id"] = scenario_id
    cursor = db.scenario_runs.find(q).sort("created_at", -1).limit(limit)
    runs = []
    for doc in cursor:
        runs.append(_clean_for_json({
            "run_id": doc.get("run_id"),
            "scenario_id": doc.get("scenario_id"),
            "scenario_name": doc.get("scenario_name"),
            "outcome": doc.get("outcome"),
            "score": doc.get("score"),
            "evaluation_notes": doc.get("evaluation_notes"),
            "created_at": doc.get("created_at"),
        }))
    return {"runs": runs, "total": len(runs)}
