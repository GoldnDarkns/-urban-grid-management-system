"""
Learned summarization for incident reports (T5 / DistilBART).
Optional: falls back to rule-based when model or deps are unavailable.
"""
from typing import Optional

_pipeline = None
_MODEL_NAME = "sshleifer/distilbart-cnn-12-6"  # smaller, fast; alt: "t5-small", "facebook/bart-large-cnn"


def _get_device_id():
    """0 for first GPU, -1 for CPU."""
    try:
        import torch
        return 0 if torch.cuda.is_available() else -1
    except Exception:
        return -1


def _load_pipeline():
    global _pipeline
    if _pipeline is not None:
        return _pipeline
    try:
        from transformers import pipeline
        _pipeline = pipeline(
            "summarization",
            model=_MODEL_NAME,
            device=_get_device_id(),  # GPU when available, else CPU
        )
        return _pipeline
    except Exception:
        return None


def summarize_incident(text: str, max_length: int = 60, min_length: int = 8) -> Optional[str]:
    """
    Summarize incident text using a pre-trained seq2seq model.
    Returns summary string or None if model unavailable or text too short.
    """
    s = (text or "").strip()
    if len(s) < 25:
        return None
    pipe = _load_pipeline()
    if pipe is None:
        return None
    try:
        # Avoid token limit overflow; many models have 1024
        out = pipe(
            s[:3000],
            max_length=max_length,
            min_length=min_length,
            do_sample=False,
            truncation=True,
        )
        if out and isinstance(out, list) and out[0].get("summary_text"):
            return out[0]["summary_text"].strip()
        return None
    except Exception:
        return None


def is_available() -> bool:
    """Return True if the summarization model can be loaded."""
    return _load_pipeline() is not None
