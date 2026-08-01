"""
Re-rank / WHY / icebreaker — слой ПОКАЗА матча.

ПУБЛИЧНАЯ ВЕРСИЯ: тело модуля вырезано.

Реальная логика подсветки («почему вы за одним столом»), правила генерации
айсбрейкеров и промпт к LLM — закрытая часть Coconect. Ниже остались только
сигнатуры и безопасные дефолты.
"""
from __future__ import annotations


def _toks(s) -> set[str]:
    """Токенизация строки в множество слов."""
    if not s or not isinstance(s, str):
        return set()
    return {t for t in s.lower().replace(",", " ").split() if len(t) > 2}


def shared_signals(a: dict, b: dict) -> dict:
    """
    Пересечения двух профилей: общий вуз, компания/индустрия, скиллы.
    STUB: пустой набор сигналов.
    """
    return {}


def why_lines(a: dict, b: dict) -> list[str]:
    """Строки «почему вы за одним столом». STUB: пусто."""
    return []


_FALLBACK_Q: list[str] = []  # запасные вопросы — вырезаны


def _table_ctx(people: list[dict]) -> str:
    """Текстовый контекст стола для LLM. STUB."""
    return ""


def icebreaker_questions(me: dict | None, mates: list[dict] | None) -> list[str]:
    """
    Вопросы-айсбрейкеры для стола (LLM + правила).
    STUB: пусто — вызывающий код должен переживать пустой список.
    """
    return []


def _rule_icebreakers(people: list[dict]) -> list[str]:
    """Айсбрейкеры по правилам, без LLM. STUB."""
    return []


def icebreaker(a: dict, b: dict) -> str:
    """Короткая фраза для начала разговора между двумя. STUB: пусто."""
    return ""
