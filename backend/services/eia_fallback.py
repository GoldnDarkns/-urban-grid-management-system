"""
EIA fallback from annual_generation_state.xls and emission_annual.xlsx when EIA API fails.
"""
import os
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

try:
    import pandas as pd
except ImportError:
    pd = None

_here = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.dirname(os.path.dirname(_here))

_gen_df = None
_emission_df = None


def _data_path(*parts: str) -> Optional[str]:
    for base in (_project_root, os.getcwd(), "/app"):
        p = os.path.join(base, "data", *parts)
        if os.path.isfile(p):
            return p
    return None


def _load_generation_fallback() -> Optional[Any]:
    global _gen_df
    if _gen_df is not None:
        return _gen_df
    if pd is None:
        return None
    try:
        path = _data_path("annual_generation_state.xls")
        if not path:
            return None
        # EIA xls often has header in first few rows; try header=0,1,2
        for header in (0, 1, 2):
            try:
                df = pd.read_excel(path, engine="xlrd", header=header)
                if df is None or df.empty or len(df.columns) < 3:
                    continue
                # Find state-like column (State, STATE, state, etc.)
                cols_lower = [str(c).lower() for c in df.columns]
                state_col = None
                for i, c in enumerate(cols_lower):
                    if "state" in c and "year" not in c:
                        state_col = df.columns[i]
                        break
                if state_col is not None:
                    _gen_df = df
                    return _gen_df
            except Exception:
                continue
    except Exception as e:
        print(f"[EIAFallback] Generation load error: {e}")
    return None


def _load_emissions_fallback() -> Optional[Any]:
    global _emission_df
    if _emission_df is not None:
        return _emission_df
    if pd is None:
        return None
    try:
        path = _data_path("emission_annual.xlsx")
        if not path:
            return None
        df = pd.read_excel(path, engine="openpyxl", header=None)
        if df is None or df.empty:
            return None
        # First row might be header; find state and CO2 columns
        for header in (0, 1, 2):
            try:
                df = pd.read_excel(path, engine="openpyxl", header=header)
                if df is None or len(df.columns) < 2:
                    continue
                cols_str = [str(c).lower() for c in df.columns]
                state_col = None
                for i, c in enumerate(cols_str):
                    if "state" in c:
                        state_col = df.columns[i]
                        break
                if state_col is not None:
                    _emission_df = df
                    return _emission_df
            except Exception:
                continue
    except Exception as e:
        print(f"[EIAFallback] Emissions load error: {e}")
    return None


def _state_col(df) -> Optional[str]:
    if df is None or df.empty:
        return None
    for c in df.columns:
        s = str(c).lower()
        if "state" in s and "year" not in s:
            return c
    return None


def get_electricity_from_fallback(state: str, limit: int = 12) -> Optional[Dict[str, Any]]:
    """Return electricity-generation-like dict for EIA API fallback. Same shape as API response."""
    df = _load_generation_fallback()
    if df is None:
        return None
    sc = _state_col(df)
    if not sc:
        return None
    st = (state or "").upper()[:2]
    if not st:
        return None
    try:
        # Filter by state (column may have full name or abbrev)
        mask = df[sc].astype(str).str.upper().str.strip().str[:2] == st
        sub = df.loc[mask]
        if sub.empty:
            sub = df.tail(50)
        sub = sub.head(limit)
        # Build API-like data list
        data = []
        year_col = next((c for c in df.columns if str(c).lower() == "year"), None)
        for _, row in sub.iterrows():
            rec = {"state": st}
            if year_col is not None:
                rec["period"] = str(row.get(year_col, ""))
            for c in sub.columns:
                if c != sc:
                    val = row.get(c)
                    if val is not None and (pd is None or pd.notna(val)):
                        try:
                            rec[str(c)] = float(val) if not isinstance(val, (int, float)) else val
                        except (TypeError, ValueError):
                            rec[str(c)] = str(val)
            data.append(rec)
        return {
            "data": data,
            "total": len(data),
            "frequency": "annual",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": "eia_fallback",
        }
    except Exception as e:
        print(f"[EIAFallback] Electricity error: {e}")
    return None


def get_co2_from_fallback(state: str, limit: int = 10) -> Optional[Dict[str, Any]]:
    """Return CO2-emissions-like dict for EIA API fallback."""
    df = _load_emissions_fallback()
    if df is None:
        return None
    sc = _state_col(df)
    if not sc:
        return None
    st = (state or "").upper()[:2]
    if not st:
        return None
    try:
        mask = df[sc].astype(str).str.upper().str.strip().str[:2] == st
        sub = df.loc[mask].head(limit)
        if sub.empty:
            sub = df.tail(limit)
        data = []
        year_col = next((c for c in df.columns if str(c).lower() == "year"), None)
        for _, row in sub.iterrows():
            rec = {"state": st}
            if year_col is not None:
                rec["period"] = str(row.get(year_col, ""))
            for c in sub.columns:
                if c != sc:
                    val = row.get(c)
                    if val is not None and (pd is None or pd.notna(val)):
                        try:
                            rec[str(c)] = float(val) if not isinstance(val, (int, float)) else val
                        except (TypeError, ValueError):
                            rec[str(c)] = str(val)
            data.append(rec)
        return {
            "data": data,
            "total": len(data),
            "frequency": "annual",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": "eia_fallback",
        }
    except Exception as e:
        print(f"[EIAFallback] CO2 error: {e}")
    return None
