import os
from typing import Dict, Any

def get_vapi_assistant_config(user_name: str, phone: str = "") -> Dict[str, Any]:
    """
    Returns the Vapi Assistant Configuration dynamically for a given user.
    This configures the AI's behavior, voice, and the data it needs to extract.
    """
    return {
        "name": "Coconect Onboarding Assistant",
        "serverUrl": f"{os.getenv('APP_URL', 'https://your-domain.com')}/vapi/status",
        # ПУБЛИЧНАЯ ВЕРСИЯ: приветствие и system-промпт голосового онбординга вырезаны.
        "firstMessage": f"Привет, {user_name}!",
        "model": {
            "provider": "openai",
            "model": "gpt-4o",
            "temperature": 0.5,
            "messages": [
                {
                    "role": "system",
                    "content": "PROMPT REDACTED IN PUBLIC BUILD",
                }
            ]
        },
        "voice": {
            "provider": "openai",
            "voiceId": "alloy", # Friendly, neutral voice
        },
        "recordingEnabled": True,
        "endCallFunctionEnabled": True,
        "analysisPlan": {
            "structuredDataSchema": {
                "type": "object",
                "properties": {
                    "goals": {
                        "type": "string",
                        "description": "The user's goals for attending dinners (e.g., networking, finding a cofounder, making friends, finding clients, etc.)"
                    },
                    "match_type": {
                        "type": "string",
                        "description": "The user's preferred match type (peer-to-peer or mentor-mentee)."
                    },
                    "logistics": {
                        "type": "string",
                        "description": "Logistics details: preferred evenings, city districts, budget, diet, languages."
                    }
                },
                "required": ["goals", "match_type", "logistics"]
            }
        }
    }
