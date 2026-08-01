-- 013: колонки под сигналы профиля. Идемпотентно.
-- (Как эти поля участвуют в скоринге — вырезано из публичной версии.)

alter table users add column if not exists communication_style text default 'casual';
alter table users add column if not exists intent_goals        jsonb default '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
