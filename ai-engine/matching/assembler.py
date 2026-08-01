"""
Greedy table assembler. Takes a flat list of guest profiles (each carrying its
per-event RSVP answers under ``_rsvp``) and partitions them into tables,
maximizing group_score and respecting hard constraints.

ПУБЛИЧНАЯ ВЕРСИЯ: тело модуля вырезано.

Реальный алгоритм рассадки (планирование размеров столов, локальный поиск,
ребаланс менторов) — закрытая часть Coconect. Ниже остались сигнатуры и
детерминированная заглушка: гости нарезаются на столы подряд, без оптимизации.
"""
from __future__ import annotations

import logging
from typing import Optional

from matching.scoring import group_score, hard_constraints_violated, pair_score, _cosine

logger = logging.getLogger(__name__)


def _admissible(table: list[dict], guest: dict) -> bool:
    """Можно ли подсадить гостя к столу. STUB: проверяем только hard constraints."""
    return all(hard_constraints_violated(g, guest) is None for g in table)


def _plan_sizes(n: int, lo: int, hi: int) -> list[int]:
    """
    Планирование размеров столов под n гостей.
    STUB: наивная нарезка по hi, остаток отдельным столом.
    """
    if n <= 0 or hi <= 0:
        return []
    sizes = [hi] * (n // hi)
    if n % hi:
        sizes.append(n % hi)
    return sizes


def _kw_overlap(a: dict, b: dict) -> float:
    """Пересечение ключевых слов профилей. STUB."""
    return 0.0


def _mentor_fit(mentor: dict, seekers: list[dict]) -> float:
    """Насколько ментор подходит группе ищущих. STUB."""
    return 0.0


def _rebalance_mentors(tables: list[list[dict]]) -> None:
    """Перераспределение менторов между столами (in-place). STUB: no-op."""
    return None


def _valid_table(t: list[dict]) -> bool:
    """Валиден ли собранный стол. STUB: непустой."""
    return bool(t)


def _mentor_ok(t: list[dict]) -> bool:
    """Есть ли за столом приемлемая менторская конфигурация. STUB."""
    return True


def _local_search(tables: list[list[dict]], rounds: int = 6) -> None:
    """Локальный поиск: своп-улучшение рассадки (in-place). STUB: no-op."""
    return None


def assemble_tables(
    guests: list[dict],
    weights: Optional[dict] = None,
    table_size_min: int = 5,
    table_size_max: int = 7,
) -> list[list[dict]]:
    """
    Разбить ``guests`` на столы размера [min, max].

    В приватной версии — планирование размеров + жадная сборка по group_score
    + локальный поиск + ребаланс менторов; непосаженные уходят в overflow.

    STUB: нарезка подряд, без всякой оптимизации. Нужна только чтобы
    вызывающий код отработал end-to-end.
    """
    if not guests:
        return []

    logger.warning("assemble_tables: публичная сборка — движок рассадки вырезан, "
                   "гости нарезаются подряд без оптимизации")

    tables: list[list[dict]] = []
    remaining = list(guests)
    for size in _plan_sizes(len(remaining), table_size_min, table_size_max):
        tables.append(remaining[:size])
        remaining = remaining[size:]
    return tables
