"""
In-app notifications + SMS stub.

In-app notifications are real (stored in user_notifications, shown via the bell).
SMS is a stub for now — it only logs; wire a provider (Twilio/etc.) later in send_sms.
"""
import logging
from database.database import get_supabase

logger = logging.getLogger(__name__)


def create_notification(user_id: str, text: str, kind: str = "info") -> None:
    try:
        get_supabase().table("user_notifications").insert(
            {"user_id": user_id, "text": text, "kind": kind}
        ).execute()
    except Exception as e:
        logger.error(f"[NOTIF] create failed for {user_id}: {e}")


def create_notifications(user_ids: list[str], text: str, kind: str = "info") -> int:
    rows = [{"user_id": uid, "text": text, "kind": kind} for uid in user_ids if uid]
    if not rows:
        return 0
    try:
        get_supabase().table("user_notifications").insert(rows).execute()
        return len(rows)
    except Exception as e:
        logger.error(f"[NOTIF] bulk insert failed: {e}")
        return 0


def send_sms(phone: str, text: str) -> bool:
    """STUB: no real SMS yet. Logs the message so the flow is testable."""
    logger.info(f"[SMS STUB] -> {phone}: {text}")
    return False  # not actually delivered
