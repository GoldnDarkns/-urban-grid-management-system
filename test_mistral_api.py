#!/usr/bin/env python3
"""Quick test of Mistral API key - calls chat completions with a simple message."""
import os
import sys

# Load .env from project root
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "").strip()
MISTRAL_API_URL = os.getenv("MISTRAL_API_URL", "https://api.mistral.ai/v1/chat/completions")
MISTRAL_MODEL = os.getenv("MISTRAL_MODEL", "mistral-small-latest")

def main():
    if not MISTRAL_API_KEY:
        print("FAIL: MISTRAL_API_KEY not set in .env")
        sys.exit(1)
    print("Testing Mistral API...")
    print(f"  URL: {MISTRAL_API_URL}")
    print(f"  Model: {MISTRAL_MODEL}")
    print()

    try:
        import requests
        r = requests.post(
            MISTRAL_API_URL,
            headers={
                "Authorization": f"Bearer {MISTRAL_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": MISTRAL_MODEL,
                "messages": [
                    {"role": "user", "content": "Reply with exactly: Mistral OK"}
                ],
                "max_tokens": 20,
            },
            timeout=15,
        )
        if r.status_code == 200:
            data = r.json()
            content = (data.get("choices") or [{}])[0].get("message", {}).get("content", "")
            print("SUCCESS: Mistral API key is working.")
            print(f"  Response: {content[:80]!r}")
        else:
            print(f"FAIL: Mistral returned {r.status_code}")
            print(f"  Body: {r.text[:500]}")
            sys.exit(1)
    except Exception as e:
        print(f"FAIL: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
