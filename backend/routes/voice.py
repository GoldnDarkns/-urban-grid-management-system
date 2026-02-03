"""
Phase 4: Voice (Deepgram STT/TTS) for Scenario Console.
Proxy to Deepgram so API key stays server-side.
"""
from __future__ import annotations

import os
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

router = APIRouter(prefix="/api/voice", tags=["Voice (Phase 4)"])

DEEPGRAM_API_KEY = os.environ.get("DEEPGRAM_API_KEY", "").strip()
DEEPGRAM_LISTEN_URL = "https://api.deepgram.com/v1/listen"
DEEPGRAM_SPEAK_URL = "https://api.deepgram.com/v1/speak"


class SynthesizeBody(BaseModel):
    text: str = ""


def _check_key():
    if not DEEPGRAM_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Voice is not configured. Set DEEPGRAM_API_KEY in the environment.",
        )


@router.post("/transcribe")
async def transcribe(audio: UploadFile = File(..., description="Audio file (webm, wav, mp3, etc.)")):
    """
    Phase 4: Speech-to-text. Accepts an audio file, sends to Deepgram, returns transcript.
    Used when user speaks in Scenario Console (voice mode).
    """
    _check_key()
    content_type = audio.content_type or "audio/webm"
    body = await audio.read()
    if not body:
        raise HTTPException(status_code=400, detail="Empty audio file.")

    import requests
    headers = {
        "Authorization": f"Token {DEEPGRAM_API_KEY}",
        "Content-Type": content_type,
    }
    params = {"punctuate": "true", "smart_format": "true"}
    try:
        r = requests.post(
            DEEPGRAM_LISTEN_URL,
            params=params,
            headers=headers,
            data=body,
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
    except requests.RequestException as e:
        detail = getattr(e, "response", None)
        if detail is not None and hasattr(detail, "text"):
            raise HTTPException(status_code=detail.status_code if hasattr(detail, "status_code") else 502, detail=detail.text[:500])
        raise HTTPException(status_code=502, detail=f"Deepgram STT failed: {e}")

    results = data.get("results") or {}
    channels = results.get("channels") or []
    transcript = ""
    if channels and channels[0].get("alternatives"):
        transcript = (channels[0]["alternatives"][0].get("transcript") or "").strip()
    return {"transcript": transcript, "raw": data}


@router.post("/synthesize")
async def synthesize(body: SynthesizeBody):
    """
    Phase 4: Text-to-speech. Sends text to Deepgram, returns audio (MP3).
    Used to speak the agent reply in Scenario Console when "Speak reply" is on.
    """
    _check_key()
    text = (body.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty text.")

    import requests
    headers = {
        "Authorization": f"Token {DEEPGRAM_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {"text": text}
    try:
        r = requests.post(
            DEEPGRAM_SPEAK_URL,
            headers=headers,
            json=payload,
            timeout=30,
        )
        r.raise_for_status()
        audio_bytes = r.content
    except requests.RequestException as e:
        resp = getattr(e, "response", None)
        if resp is not None and hasattr(resp, "status_code"):
            raise HTTPException(status_code=resp.status_code, detail=(resp.text[:500] if hasattr(resp, "text") else str(e)))
        raise HTTPException(status_code=502, detail=f"Deepgram TTS failed: {e}")

    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=reply.mp3"},
    )


@router.get("/config")
async def voice_config():
    """Return whether voice (Deepgram) is available (API key set)."""
    return {"enabled": bool(DEEPGRAM_API_KEY)}
