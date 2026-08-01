import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv

# Добавляем ai-engine в пути, чтобы импорты работали
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
load_dotenv()

from wa import send, steps
from wa.lifecycle import (
    msg_dinner_ready, msg_confirm, msg_icebreakers, msg_afterparty, msg_feedback_l1, icebreaker_params,
    RSVP_BUTTONS, CONFIRM_BUTTONS,
)
import logging

logging.basicConfig(level=logging.INFO)

phone = os.getenv("WA_TEST_TO", "")  # ← свой номер в .env, иначе слать некуда

# Моковые данные для ивента
ev = {
    "title": "Entrepreneurs & Tech Leaders",
    "event_date": "2026-06-25",
    "start_time": "19:00:00",
    "city": "London",
    "address": "Soho House, 76 Dean St",
    "afterparty_location": "The Groucho Club"
}

# Моковые данные для людей (соседей по столу)
mates = [
    {"name": "Alice", "headline": "Founder @ AI Startup", "current_status": {}},
    {"name": "Bob", "headline": "Product Director @ Fintech", "current_status": {}},
    {"name": "Charlie", "headline": "VC Investor", "current_status": {}}
]

def run():
    print(f"Sending samples to {phone}...")
    
    me = {"name": "Michael"}

    # --- COLD-СТАРТ: ОДНО персональное приветствие+вопрос (по LinkedIn). Дальше диалог ведёт сам. ---
    from llm_extract import onboarding_opener
    mock_ctx = "Name: Michael\nCity: Toronto\nRole: Founder at an AI startup\nDomains: AI, SaaS\nTop skills: Python, Product"
    opener = onboarding_opener(mock_ctx, me["name"])
    greeting = f"Hi, {me['name']}! 👋 {opener}\n\n_Reply however you like — *text* or a *voice message* 🎙️._"
    send.send_text(phone, greeting)
    print(f"Sent: personalized greeting → {opener!r}")
    time.sleep(1.5)

    # --- LIFECYCLE ---
    send.send_buttons(phone, msg_dinner_ready(ev, mates), RSVP_BUTTONS); print("Sent: dinner ready (T-72h) + IN/OUT buttons"); time.sleep(1.5)
    send.send_buttons(phone, msg_confirm(ev), CONFIRM_BUTTONS); print("Sent: confirm (T-24h) + YES/NO buttons"); time.sleep(1.5)
    send.send_text(phone, msg_icebreakers(icebreaker_params(me, mates))); print("Sent: icebreakers"); time.sleep(1.5)
    send.send_text(phone, msg_afterparty(ev)); print("Sent: afterparty"); time.sleep(1.5)
    send.send_text(phone, msg_feedback_l1(ev)); print("Sent: feedback L1")

    print("All samples sent!")

if __name__ == "__main__":
    run()
