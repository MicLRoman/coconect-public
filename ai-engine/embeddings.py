from google import genai
from google.genai import types
import numpy as np
import os

from dotenv import load_dotenv
load_dotenv()

def get_embedding(text: str) -> list[float]:
    """Генерация 768-мерного нормализованного вектора через Gemini"""
    if not text or not text.strip():
        return [0.0] * 768
        
    IMITATION_MODE = os.getenv("IMITATION_MODE", "true").lower() in ("true", "1", "yes")
    
    if IMITATION_MODE:
        mock_embedding = np.random.rand(768)
        return (mock_embedding / np.linalg.norm(mock_embedding)).tolist()
        
    client = genai.Client()
    formatted_text = f"task: sentence similarity | query: {text}"
    
    response = client.models.embed_content(
        model='gemini-embedding-2-preview',
        contents=formatted_text,
        config=types.EmbedContentConfig(output_dimensionality=768)
    )
    
    embedding_values_np = np.array(response.embeddings[0].values)
    normed_embedding = embedding_values_np / np.linalg.norm(embedding_values_np)
    
    return normed_embedding.tolist()

def generate_give_vector(scraped_data: dict) -> list[float]:
    """
    Creates the 'GIVE' vector. What does the user offer?
    Built from skills, past companies, and proof of work.
    """
    skills = ", ".join(scraped_data.get("hard_skills", []))
    work = ". ".join(scraped_data.get("proof_of_work", []))
    title = scraped_data.get("current_title", "")
    text_to_embed = f"Title: {title}. Skills: {skills}. Proof of work: {work}."
    return get_embedding(text_to_embed)

def generate_ask_vector(intent_subject: str) -> list[float]:
    """
    Creates the 'ASK' vector. What is the user looking for?
    Built directly from the parsed Intent Subject.
    """
    return get_embedding(intent_subject)

def generate_give_vector_smart(gives: dict) -> list[float]:
    """Создает GIVE вектор из структурированных данных профиля"""
    education = gives.get("education", "")
    exp = ", ".join(gives.get("experience_level", []))
    domains = ", ".join(gives.get("domains", []) or gives.get("industry", []))
    skills = ", ".join(gives.get("hard_skills", []))
    
    status = gives.get("current_status", {})
    status_str = f"{status.get('type', '')} at {status.get('company_name', '')} ({status.get('stage', '')})"
    
    text_to_embed = f"Status: {status_str}. Education: {education}. Experience: {exp}. Domains: {domains}. Skills: {skills}."
    return get_embedding(text_to_embed)

def generate_ask_vector_smart(asks: dict) -> list[float]:
    """Создает ASK вектор из свободного текста запроса (ядро метчинга, см. §0/§6.2)."""
    raw_req = asks.get("custom_request_raw", "") or ""
    
    # Бэк-совместимость + новые поля
    intents = ", ".join(asks.get("intents", []) or asks.get("intent_goals", []) or [])
    match_type = asks.get("match_type", "")
    
    parts = [p for p in [raw_req, intents, match_type] if p]
    text_to_embed = ". ".join(parts).strip(". ")
    
    return get_embedding(text_to_embed)