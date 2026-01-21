"""
Transformer-based incident category classifier (DistilBERT fine-tuned).
Optional: falls back to rule-based when model or deps are unavailable.
"""
from pathlib import Path
from typing import Any, Dict, Optional

# Model dir relative to project root
MODEL_DIR = Path(__file__).resolve().parent.parent / "models" / "transformer_incident_model"

_model = None
_tokenizer = None
_id2label = None


def _get_device():
    """GPU if available, else CPU."""
    try:
        import torch
        return torch.device("cuda" if torch.cuda.is_available() else "cpu")
    except Exception:
        return "cpu"


def _load_model() -> bool:
    global _model, _tokenizer, _id2label
    if _model is not None:
        return True
    if not MODEL_DIR.exists() or not (MODEL_DIR / "config.json").exists():
        return False
    try:
        from transformers import AutoModelForSequenceClassification, AutoTokenizer
        _tokenizer = AutoTokenizer.from_pretrained(str(MODEL_DIR))
        _model = AutoModelForSequenceClassification.from_pretrained(str(MODEL_DIR))
        _model = _model.to(_get_device())
        _model.eval()
        # id2label from config
        _id2label = getattr(_model.config, "id2label", None) or {
            str(i): c for i, c in enumerate(
                ["transformer_fault", "voltage_issue", "outage", "high_demand",
                 "pollution_complaint", "safety_hazard", "equipment_failure", "cable_damage",
                 "weather_damage", "other"]
            )
        }
        return True
    except Exception:
        return False


def predict_category(text: str, max_length: int = 256) -> Optional[Dict[str, Any]]:
    """
    Classify incident category using fine-tuned DistilBERT.
    Returns {"category": str, "confidence": float} or None if model unavailable.
    """
    if not text or not str(text).strip():
        return None
    if not _load_model():
        return None
    try:
        import torch
        inputs = _tokenizer(
            str(text)[:2000],
            return_tensors="pt",
            truncation=True,
            max_length=max_length,
            padding=True
        )
        device = next(_model.parameters()).device
        inputs = {k: v.to(device) for k, v in inputs.items()}
        with torch.no_grad():
            logits = _model(**inputs).logits
        probs = torch.softmax(logits, dim=-1).squeeze().tolist()
        if isinstance(probs[0], list):
            probs = probs[0]
        pred_idx = int(torch.argmax(logits, dim=-1).item())
        confidence = float(probs[pred_idx])
        label = _id2label.get(str(pred_idx), _id2label.get(pred_idx, "other"))
        return {"category": label, "confidence": round(confidence, 2)}
    except Exception:
        return None


def is_available() -> bool:
    """Return True if the transformer model is loaded and ready."""
    return _load_model()
