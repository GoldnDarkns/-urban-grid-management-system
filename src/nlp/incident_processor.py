"""
NLP Processor for Incident Reports
Uses domain-specific rules + optional transformer (DistilBERT) and learned summarization (T5/DistilBART).
Falls back to rules when ML models are unavailable.
"""
import re
from typing import Dict, List, Optional
from datetime import datetime

# Canonical category order for transformer and rules (must stay in sync)
INCIDENT_CATEGORIES = [
    "transformer_fault", "voltage_issue", "outage", "high_demand",
    "pollution_complaint", "safety_hazard", "equipment_failure", "cable_damage",
    "weather_damage", "other"
]

# Domain-specific keywords for energy/grid terminology (expanded)
ENERGY_KEYWORDS = {
    "transformer_fault": [
        "transformer", "overheating", "burning", "smoke", "failure", "fault", "malfunction",
        "substation transformer", "blown transformer", "transformer tripped", "humming", "buzzing",
        "burning smell", "oil leak", "tap changer", "bushing", "core", "winding"
    ],
    "voltage_issue": [
        "voltage", "fluctuation", "spike", "drop", "low voltage", "high voltage", "unstable",
        "sag", "swell", "brownout", "power quality", "flickering", "lights dim", "surge",
        "overvoltage", "undervoltage", "voltage dip", "sags and swells"
    ],
    "outage": [
        "outage", "power cut", "blackout", "no power", "power loss", "interruption", "trip",
        "power off", "lights out", "no electricity", "service interruption", "trip out",
        "repeated trips", "circuit tripped", "main tripped", "restoration", "eta"
    ],
    "high_demand": [
        "overload", "peak demand", "high consumption", "excessive load", "demand spike",
        "load shedding", "capacity", "grid stress", "exceeding capacity", "peak load",
        "rolling blackout", "load curtailment", "demand response", "baseload"
    ],
    "pollution_complaint": [
        "pollution", "smoke", "smell", "air quality", "aqi", "haze", "visibility", "breathing",
        "emissions", "particulates", "pm2.5", "pm10", "smog", "dust", "odor", "industrial",
        "respiratory", "asthma", "pollutant", "exhaust"
    ],
    "safety_hazard": [
        "fire", "explosion", "spark", "electrical hazard", "danger", "unsafe", "risk",
        "arc flash", "electrocution", "exposed wire", "live wire", "ground fault",
        "evacuate", "emergency response", "first responder", "injury", "shock"
    ],
    "equipment_failure": [
        "equipment", "device", "component", "system failure", "breakdown", "malfunction",
        "relay", "switchgear", "breaker", "meter", "inverter", "capacitor", "reactor",
        "scada", "rtu", "protection relay", "failed to operate", "offline"
    ],
    "cable_damage": [
        "cable", "wire", "line", "damage", "cut", "broken", "exposed",
        "underground cable", "overhead line", "distribution line", "faulted cable",
        "excavation", "dig", "backhoe", "rodent", "tree contact", "insulation"
    ],
    "weather_damage": [
        "storm", "wind", "rain", "lightning", "weather", "damage", "tree fall",
        "flood", "flooding", "ice", "icing", "snow", "high wind", "gust", "tornado",
        "downed line", "pole down", "tree on line", "wind damage", "storm damage"
    ]
}

URGENCY_KEYWORDS = {
    "critical": [
        "critical", "immediate", "urgent", "emergency", "fire", "explosion", "life-threatening", "hospital",
        "evacuate", "right now", "as we speak", "ongoing", "multiple injuries", "mass outage"
    ],
    "high": [
        "high priority", "asap", "soon", "important", "serious", "severe", "damage", "overheating",
        "escalat", "escalation", "dispatch", "crew needed", "widespread", "large area", "hundreds"
    ],
    "medium": [
        "monitor", "investigate", "check", "review", "moderate", "concern",
        "schedule", "inspect", "assess", "evaluate", "intermittent", "recurring"
    ],
    "low": [
        "routine", "maintenance", "advisory", "informational", "minor",
        "planned", "notification", "heads up", "fyi", "cosmetic", "non-urgent"
    ]
}

def _classify_with_transformer(text: str) -> Optional[Dict[str, any]]:
    """Use fine-tuned DistilBERT when available. Returns None to fall back to rules."""
    try:
        from src.nlp.transformer_classifier import predict_category
        return predict_category(text)
    except Exception:
        return None


def classify_incident(text: str) -> Dict[str, any]:
    """
    Classify incident type: transformer (DistilBERT) when available, else rule-based keywords.
    Returns category and confidence score.
    """
    res = _classify_with_transformer(text)
    if res and res.get("category") and res.get("confidence") is not None:
        return {"category": res["category"], "confidence": res["confidence"]}
    # Fallback: domain-specific keyword matching
    text_lower = text.lower()
    scores = {}
    for category, keywords in ENERGY_KEYWORDS.items():
        score = sum(1 for keyword in keywords if keyword in text_lower)
        if score > 0:
            scores[category] = score / len(keywords)
    if not scores:
        category = "other"
        confidence = 0.3
    else:
        category = max(scores, key=scores.get)
        confidence = min(scores[category] * 2, 1.0)
    return {"category": category, "confidence": round(confidence, 2)}

def detect_urgency(text: str, context: Optional[Dict] = None) -> str:
    """
    Detect urgency from text and context.
    Uses hybrid approach: NLP keywords + context (zone risk, AQI, etc.)
    """
    text_lower = text.lower()
    urgency_score = 0
    
    # Text-based urgency detection
    for level, keywords in URGENCY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                if level == "critical":
                    urgency_score += 4
                elif level == "high":
                    urgency_score += 2
                elif level == "medium":
                    urgency_score += 1
                break
    
    # Context-based urgency boost
    if context:
        zone_risk_level = context.get("zone_risk_level", "low")
        if zone_risk_level == "high":
            urgency_score += 2
        elif zone_risk_level == "medium":
            urgency_score += 1
        
        current_aqi = context.get("current_aqi", 0)
        if current_aqi > 200:
            urgency_score += 2
        elif current_aqi > 150:
            urgency_score += 1
        
        has_hospital = context.get("has_hospital", False)
        if has_hospital:
            urgency_score += 1
        
        recent_alerts = context.get("recent_alerts", 0)
        if recent_alerts > 5:
            urgency_score += 1
    
    # Determine final urgency
    if urgency_score >= 6:
        return "critical"
    elif urgency_score >= 4:
        return "high"
    elif urgency_score >= 2:
        return "medium"
    else:
        return "low"

def extract_entities(text: str) -> Dict[str, List[str]]:
    """
    Extract entities from incident text.
    Returns zones, equipment, time phrases, and counts.
    """
    entities = {
        "zones": [],
        "equipment": [],
        "time_phrases": [],
        "counts": []
    }
    
    # Extract zone IDs (Z_XXX pattern)
    zone_pattern = r'\bZ_\d{3}\b'
    zones = re.findall(zone_pattern, text, re.IGNORECASE)
    entities["zones"] = list(set(zones))
    
    # Extract equipment mentions (expanded)
    equipment_keywords = [
        "transformer", "feeder", "cable", "line", "substation", "meter", "switch", "breaker",
        "relay", "recloser", "fuse", "disconnect", "capacitor", "reactor", "inverter",
        "pole", "tower", "conductor", "insulator", "switchgear", "rtu", "scada"
    ]
    seen = set()
    for keyword in equipment_keywords:
        if keyword.lower() in text.lower() and keyword.lower() not in seen:
            entities["equipment"].append(keyword)
            seen.add(keyword.lower())
    
    # Extract time phrases
    time_patterns = [
        r'\d+\s*(?:times?|hours?|days?|weeks?)',
        r'since\s+(?:morning|afternoon|evening|night|yesterday)',
        r'(?:this|last)\s+(?:morning|afternoon|evening|night|week|month)'
    ]
    for pattern in time_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        entities["time_phrases"].extend(matches)
    
    # Extract counts/numbers
    count_pattern = r'\b(\d+)\s*(?:times?|outages?|incidents?|failures?)'
    counts = re.findall(count_pattern, text, re.IGNORECASE)
    entities["counts"] = counts
    
    return entities

def analyze_sentiment(text: str) -> str:
    """
    Simple sentiment analysis using keyword matching.
    Returns: positive, negative, or neutral
    """
    text_lower = text.lower()
    
    negative_keywords = [
        "failure", "broken", "outage", "problem", "issue", "damage", "critical", "urgent", "overheating",
        "malfunction", "severe", "danger", "unsafe", "complaint", "frustrated", "angry", "worst",
        "unacceptable", "delayed", "still down", "not fixed", "recurring", "again", "escalat"
    ]
    positive_keywords = [
        "resolved", "fixed", "working", "normal", "stable", "good", "success",
        "restored", "back on", "cleared", "repaired", "completed", "thank", "appreciate",
        "efficient", "resolved", "restoration complete"
    ]
    
    negative_score = sum(1 for kw in negative_keywords if kw in text_lower)
    positive_score = sum(1 for kw in positive_keywords if kw in text_lower)
    
    if negative_score > positive_score:
        return "negative"
    elif positive_score > negative_score:
        return "positive"
    else:
        return "neutral"

def _summarize_with_model(text: str) -> Optional[str]:
    """Use learned summarization (T5/DistilBART) when available. Returns None to fall back to rules."""
    try:
        from src.nlp.summarization import summarize_incident
        return summarize_incident(text, max_length=55, min_length=8)
    except Exception:
        return None


def generate_summary(text: str, category: str, zone_name: Optional[str] = None) -> str:
    """
    Generate a one-line summary: learned model (T5/DistilBART) when available, else rule-based.
    """
    learned = _summarize_with_model(text)
    if learned and len(learned.strip()) > 5:
        # Optionally append zone when we have it and it's not already in the learned summary
        zone_match = re.search(r'\bZ_\d{3}\b', text, re.IGNORECASE)
        zone_id = zone_match.group(0) if zone_match else None
        loc = zone_name or zone_id
        if loc and loc.lower() not in learned.lower():
            learned = f"{learned.rstrip('.')} in {loc}"
        return learned
    # Rule-based fallback
    zone_match = re.search(r'\bZ_\d{3}\b', text, re.IGNORECASE)
    zone_id = zone_match.group(0) if zone_match else None
    if category == "transformer_fault":
        summary = "Transformer issue"
    elif category == "voltage_issue":
        summary = "Voltage problem"
    elif category == "outage":
        summary = "Power outage"
    elif category == "high_demand":
        summary = "High demand/overload"
    elif category == "pollution_complaint":
        summary = "Air quality concern"
    elif category == "safety_hazard":
        summary = "Safety hazard"
    else:
        summary = f"{category.replace('_', ' ').title()}"
    if zone_name:
        summary += f" in {zone_name}"
    elif zone_id:
        summary += f" in {zone_id}"
    return summary

def process_incident(text: str, context: Optional[Dict] = None, zone_name: Optional[str] = None) -> Dict:
    """
    Complete NLP processing pipeline for an incident report.
    
    Args:
        text: Incident description text
        context: Optional context dict with zone metrics (risk_score, aqi, etc.)
        zone_name: Optional zone name for summary
    
    Returns:
        Complete NLP analysis dictionary
    """
    # Classification
    classification = classify_incident(text)
    
    # Urgency detection
    urgency = detect_urgency(text, context)
    
    # Entity extraction
    entities = extract_entities(text)
    
    # Sentiment analysis
    sentiment = analyze_sentiment(text)
    
    # Summary generation
    summary = generate_summary(text, classification["category"], zone_name)
    
    return {
        "category": classification["category"],
        "category_confidence": classification["confidence"],
        "urgency": urgency,
        "sentiment": sentiment,
        "entities": entities,
        "summary": summary,
        "processed_at": datetime.utcnow().isoformat()
    }
