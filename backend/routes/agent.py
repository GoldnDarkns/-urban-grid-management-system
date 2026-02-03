"""
Phase 2c: Domain-specific AI agent API.
POST /api/agent/start, POST /api/agent/message.
Phase 2e: Agent runs persisted to MongoDB (agent_runs); GET /api/agent/runs.
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

router = APIRouter(prefix="/api/agent", tags=["Agent (Phase 2c/2e)"])

# In-memory sessions: session_id -> { city_id, zone_id, clarifying_count, message_history }
_sessions: Dict[str, Dict[str, Any]] = {}


class StartBody(BaseModel):
    city_id: Optional[str] = None


class MessageBody(BaseModel):
    session_id: str = Field(..., description="Session ID from POST /api/agent/start")
    message: str = Field(..., description="User message or scenario question")
    city_id: Optional[str] = Field(None, description="Override city for this message")
    zone_id: Optional[str] = Field(None, description="Override or provide zone (e.g. after clarifying)")


@router.post("/start")
async def agent_start(body: Optional[StartBody] = None):
    """
    Phase 2c: Start an agent session. Returns session_id and optional city_id.
    Frontend stores session_id and sends it with POST /api/agent/message.
    """
    session_id = str(uuid.uuid4())
    city_id = (getattr(body, "city_id", None) if body else None) or ""
    city_id = (city_id or "").strip().lower() or None
    _sessions[session_id] = {
        "city_id": city_id,
        "zone_id": None,
        "clarifying_count": 0,
        "message_history": [],
    }
    return {"session_id": session_id, "city_id": city_id}


@router.post("/message")
async def agent_message(body: MessageBody):
    """
    Phase 2c: Send a message to the domain-specific AI. Returns assistant_reply, scenario_result, run_id, trace.
    If the orchestrator asks a clarifying question (e.g. "Which zone?"), include zone_id in the next message.
    """
    session_id = body.session_id.strip()
    if session_id not in _sessions:
        raise HTTPException(status_code=400, detail="Invalid or expired session_id. Call POST /api/agent/start first.")
    session = _sessions[session_id]

    city_id = (body.city_id or session.get("city_id") or "").strip().lower() or None
    zone_id = (body.zone_id or session.get("zone_id") or "").strip() or None

    # If user provided a zone in the message (e.g. "Z_001"), use it
    msg = (body.message or "").strip()
    if not msg:
        return {
            "assistant_reply": "Please provide a message or scenario question.",
            "scenario_result": {"affected_zones": [], "hypotheses": [], "evidence_ids": [], "recommended_actions": [], "clarifying_question": False, "message": "No message"},
            "run_id": str(uuid.uuid4()),
            "trace": [],
        }

    # Optional: parse zone from message (e.g. "Z_001" or "zone Z_001")
    import re
    zone_match = re.search(r"\b(Z_\d{3})\b", msg, re.I)
    if zone_match and not zone_id:
        zone_id = zone_match.group(1)

    scenario_result, assistant_reply, trace = orchestrator_run(
        session_id=session_id,
        city_id=city_id,
        zone_id=zone_id,
        message=msg,
        session_state=session,
    )

    # Update session: if this was a clarifying response, increment count and store zone
    if scenario_result.get("clarifying_question"):
        session["clarifying_count"] = session.get("clarifying_count", 0) + 1
    else:
        session["clarifying_count"] = 0
    if zone_id:
        session["zone_id"] = zone_id
    session["city_id"] = city_id or session.get("city_id")
    session["message_history"] = session.get("message_history", []) + [
        {"role": "user", "content": msg[:500]},
        {"role": "assistant", "content": assistant_reply[:500]},
    ]

    run_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    # Phase 2e: persist run to MongoDB for "View Run Log"
    db = get_city_db()
    if db is not None:
        try:
            db.agent_runs.insert_one({
                "run_id": run_id,
                "session_id": session_id,
                "city_id": city_id or session.get("city_id"),
                "user_input": msg[:2000],
                "created_at": now,
                "assistant_reply": assistant_reply[:2000],
                "scenario_result_summary": {
                    "affected_zones": scenario_result.get("affected_zones", [])[:20],
                    "hypotheses_count": len(scenario_result.get("hypotheses", [])),
                    "evidence_ids_count": len(scenario_result.get("evidence_ids", [])),
                    "recommended_actions_count": len(scenario_result.get("recommended_actions", [])),
                },
                "trace": trace,
            })
        except Exception:
            pass

    return {
        "assistant_reply": assistant_reply,
        "scenario_result": scenario_result,
        "run_id": run_id,
        "trace": trace,
    }


@router.get("/runs")
async def agent_runs_list(session_id: Optional[str] = Query(None, description="Filter by session ID")):
    """
    Phase 2e: List agent runs, optionally by session_id. Returns run_id, session_id, city_id, user_input, created_at, trace length.
    """
    db = get_city_db()
    if db is None:
        return {"runs": [], "total": 0}
    q = {}
    if session_id:
        q["session_id"] = session_id.strip()
    cursor = db.agent_runs.find(q).sort("created_at", -1).limit(50)
    runs = []
    for doc in cursor:
        runs.append({
            "run_id": doc.get("run_id"),
            "session_id": doc.get("session_id"),
            "city_id": doc.get("city_id"),
            "user_input": (doc.get("user_input") or "")[:200],
            "created_at": doc.get("created_at").isoformat() if hasattr(doc.get("created_at"), "isoformat") else str(doc.get("created_at")),
            "trace_steps": len(doc.get("trace") or []),
        })
    return {"runs": runs, "total": len(runs)}


@router.get("/runs/{run_id}")
async def agent_run_get(run_id: str):
    """
    Phase 2e: Get one agent run by run_id (full trace and scenario_result_summary).
    """
    db = get_city_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    doc = db.agent_runs.find_one({"run_id": run_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Run not found")
    from bson import ObjectId
    def _clean_obj(obj, depth=0, max_d=15):
        if depth > max_d:
            return str(obj) if obj is not None else None
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, dict):
            return {k: _clean_obj(v, depth + 1, max_d) for k, v in obj.items()}
        if isinstance(obj, (list, tuple)):
            return [_clean_obj(x, depth + 1, max_d) for x in obj]
        if hasattr(obj, "isoformat") and callable(getattr(obj, "isoformat")):
            try:
                return obj.isoformat()
            except Exception:
                return str(obj)
        return obj
    return {
        "run_id": doc.get("run_id"),
        "session_id": doc.get("session_id"),
        "city_id": doc.get("city_id"),
        "user_input": doc.get("user_input"),
        "created_at": doc.get("created_at").isoformat() if hasattr(doc.get("created_at"), "isoformat") else str(doc.get("created_at")),
        "assistant_reply": doc.get("assistant_reply"),
        "scenario_result_summary": _clean_obj(doc.get("scenario_result_summary")),
        "trace": _clean_obj(doc.get("trace")),
    }
