# Тест метчинга (end-to-end на реальных LinkedIn + синтетических ASK)

Гоняем реальные give-данные (LinkedIn) + сгенерированные ASK/психотип через
текущий алгос (scoring + assembler) и смотрим, какие столы выходят.

Требования: `IMITATION_MODE=false` в `ai-engine/.env` (реальные вектора + extraction),
платный/рабочий `APIFY_TOKEN`. Все команды — из папки `ai-engine`.

## Шаги
1. **Юзернеймы** → впиши в `test/usernames.txt` (по одному на строку, ~30 шт).
2. **Парсинг** → `py test/parse_profiles.py`
   - кэширует сырые JSON в `test/cache/<username>.json` (повтор не тратит Apify);
   - пишет `test/profiles_for_llm.json`.
3. **LLM (вручную)** → скорми `profiles_for_llm.json` в LLM по `LLM_PROMPT.md`,
   результат сохрани как `test/asks.json` (ASK + social_battery + pace на каждого).
4. **Сборка** → `py test/build_users.py` → `test/users.json` (give/ask вектора).
5. **Рассадка** → `py test/run_matching.py` (или `... 5 6` для размеров столов)
   → `test/report.html`. Открой и при желании скорми LLM для оценки.

## Заметки
- Язык всем принудительно `English` (тестовое упрощение — см. MATCHING_DESIGN §8).
- relevance пул-нормируется по этим 30 (p5/p95) — спред скоров виден в отчёте.
- Город всем принудительно один (`TEST_CITY`, по умолчанию "Toronto") — чтобы
  city-HC не дробил столы. Переопределить: `TEST_CITY="Berlin" py test/build_users.py`.
