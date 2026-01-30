"""
Traffic fallback from traffic_speed_20260129.csv (Chicago segment speeds) when TomTom API fails.
"""
import os
from datetime import datetime, timezone
from typing import Dict, Any, Optional

_here = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.dirname(os.path.dirname(_here))

_traffic_fallback_row = None


def _data_path(*parts: str) -> str:
    for base in (_project_root, os.getcwd(), "/app"):
        p = os.path.join(base, "data", *parts)
        if os.path.isfile(p):
            return p
    return os.path.join(_project_root, "data", *parts)


def _load_traffic_fallback() -> Optional[Dict[str, Any]]:
    """Load one row with valid speed from CSV for fallback."""
    global _traffic_fallback_row
    if _traffic_fallback_row is not None:
        return _traffic_fallback_row
    try:
        import pandas as pd
        for name in ("traffic_speed_20260129.csv", "traffic_fallback.csv"):
            path = _data_path(name)
            if not os.path.isfile(path):
                continue
            df = pd.read_csv(path, nrows=2000)
            if df is None or df.empty:
                continue
            df.columns = [c.strip() for c in df.columns]
            speed_col = "CURRENT_SPEED" if "CURRENT_SPEED" in df.columns else None
            if not speed_col:
                break
            # Prefer a row with positive speed
            valid = df[df[speed_col].astype(float, errors="ignore") > 0]
            row = valid.iloc[0] if len(valid) else df.iloc[0]
            try:
                current = float(row[speed_col])
            except (TypeError, ValueError):
                current = 40.0
            if current <= 0:
                current = 40.0
            _traffic_fallback_row = {
                "current_speed": current,
                "free_flow_speed": min(60.0, current * 1.3),
                "confidence": 0.5,
                "frc": "",
                "road_closure": False,
            }
            return _traffic_fallback_row
    except Exception as e:
        print(f"[TrafficFallback] Load error: {e}")
    _traffic_fallback_row = {
        "current_speed": 40.0,
        "free_flow_speed": 60.0,
        "confidence": 0.5,
        "frc": "",
        "road_closure": False,
    }
    return _traffic_fallback_row


def get_traffic_from_fallback(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """Return traffic-like dict for TomTom fallback. Same shape as TomTom response."""
    row = _load_traffic_fallback()
    if not row:
        return None
    return {
        "frc": row.get("frc", ""),
        "current_speed": row.get("current_speed", 40),
        "free_flow_speed": row.get("free_flow_speed", 60),
        "confidence": row.get("confidence", 0.5),
        "road_closure": row.get("road_closure", False),
        "coordinates": {"lat": lat, "lon": lon},
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "traffic_fallback",
    }
