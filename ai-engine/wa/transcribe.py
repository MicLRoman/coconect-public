import os
import logging
import httpx
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

API_VERSION = os.getenv("WA_API_VERSION", "v21.0")
TOKEN = os.getenv("WA_TOKEN")


def get_media_url(media_id: str) -> str | None:
    if not TOKEN:
        logger.warning("[WA] WA_TOKEN not set, cannot fetch media.")
        return None
    url = f"https://graph.facebook.com/{API_VERSION}/{media_id}"
    try:
        r = httpx.get(url, headers={"Authorization": f"Bearer {TOKEN}"}, timeout=10)
        if r.status_code >= 400:
            logger.error(f"[WA] Failed to get media info {r.status_code}: {r.text}")
            return None
        return r.json().get("url")
    except Exception as e:
        logger.error(f"[WA] Error fetching media url: {e}")
        return None


def download_media(media_url: str) -> bytes | None:
    try:
        r = httpx.get(media_url, headers={"Authorization": f"Bearer {TOKEN}"}, timeout=20)
        if r.status_code >= 400:
            logger.error(f"[WA] Failed to download media {r.status_code}")
            return None
        return r.content
    except Exception as e:
        logger.error(f"[WA] Error downloading media: {e}")
        return None


def transcribe_bytes(audio_bytes: bytes, mime_type: str = "audio/ogg") -> str | None:
    """Транскрибирует уже скачанные/загруженные байты аудио через Gemini. Общее ядро
    для WA-голосовух (transcribe_audio) и веб-голосового ввода (main.py /onboarding/transcribe)."""
    if not audio_bytes:
        return None
    try:
        client = genai.Client()
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
                'Transcribe this audio. Output ONLY the raw text without any formatting, markdown, or comments. The audio may be in Russian or English.'
            ]
        )
        text = response.text.strip()
        logger.info(f"[transcribe] {len(audio_bytes)} bytes ({mime_type}) -> {text!r}")
        return text
    except Exception as e:
        logger.error(f"[transcribe] error: {e}")
        return None


def transcribe_audio(media_id: str) -> str | None:
    """Downloads audio from WA and transcribes it via Gemini."""
    url = get_media_url(media_id)
    if not url:
        return None

    audio_bytes = download_media(url)
    if not audio_bytes:
        return None

    return transcribe_bytes(audio_bytes, mime_type="audio/ogg")
