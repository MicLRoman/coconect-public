"""
Pairwise + group scoring for table seating.

ПУБЛИЧНАЯ ВЕРСИЯ: тело модуля вырезано.

Реальные веса, формулы совместимости и калибровка пула — закрытая часть
Coconect и в этот репозиторий не входят. Ниже остались только сигнатуры и
нейтральные заглушки, чтобы остальной код импортировался и запускался.

A "guest" dict here is a user row from `users` with the user's per-event RSVP
answers attached under the key ``_rsvp``. ``pair_score`` is symmetric so table
assembly is order-independent.
"""
from __future__ import annotations

from typing import Optional

import numpy as np


def _cosine(v1, v2) -> float:
    """Косинусная близость двух векторов. 0.0, если вектор пустой/битый."""
    if v1 is None or v2 is None:
        return 0.0
    a, b = np.asarray(v1, dtype=float), np.asarray(v2, dtype=float)
    if a.size == 0 or b.size == 0 or a.shape != b.shape:
        return 0.0
    na, nb = float(np.linalg.norm(a)), float(np.linalg.norm(b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


def _norm_city(c) -> str:
    """Нормализация названия города для сравнения."""
    return (c or "").strip().lower()


def hard_constraints_violated(a: dict, b: dict) -> Optional[str]:
    """
    Жёсткие запреты на посадку двоих за один стол (разные города, блок-листы,
    повторные встречи и т.п.).

    Возвращает причину-строку или None, если посадить можно.
    STUB: всегда None.
    """
    return None


def communication_style_fit(a: dict, b: dict) -> float:
    """Совместимость стилей общения. STUB."""
    return 0.0


def match_type_fit(a: dict, b: dict) -> float:
    """Совместимость заявленных типов метча. STUB."""
    return 0.0


def feedback_factor(a: dict, b: dict) -> float:
    """Множитель по истории фидбека прошлых ужинов. STUB: нейтральный 1.0."""
    return 1.0


_COMPLEMENT: list = []   # таксономия взаимодополняющих интентов — вырезана
_COMPETING: set = set()  # таксономия конкурирующих интентов — вырезана


def intent_complement(a: dict, b: dict) -> float:
    """Насколько интенты двоих дополняют друг друга. STUB."""
    return 0.0


def _homogeneity_penalty(table: list[dict]) -> float:
    """Штраф за моно-интент за столом. STUB."""
    return 0.0


def _event_sync(a: dict, b: dict) -> float:
    """Совпадение по событиям / расписанию. STUB."""
    return 0.0


def calibrate_pool(users: list[dict]) -> tuple[float, float]:
    """
    Калибровка распределения сырых скоров по пулу гостей.
    Возвращает (mean, std). STUB: (0.0, 1.0).
    """
    return 0.0, 1.0


def _relevance(raw: float) -> float:
    """Сырой скор -> релевантность. STUB: тождество."""
    return float(raw)


def pair_score(a: dict, b: dict, weights: Optional[dict] = None) -> float:
    """
    Итоговый скор пары.

    В приватной версии — взвешенная свёртка векторной близости give/ask,
    интентов, стиля общения, фидбека и «жёстких» сигналов.
    STUB: 0.0.
    """
    return 0.0


def gender_balance(table: list[dict]) -> float:
    """Гендерный баланс стола. STUB."""
    return 0.0


def group_score(table: list[dict], weights: Optional[dict] = None,
                table_size_min: int = 5, table_size_max: int = 6) -> float:
    """
    Скор стола целиком.

    В приватной версии — MIN-доминированная свёртка попарных скоров
    со штрафами за разброс, изоляцию и однородность.
    STUB: 0.0.
    """
    return 0.0
