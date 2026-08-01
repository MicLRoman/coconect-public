-- 011: структурные блоки LinkedIn для ЛК-отображения и айсбрейкеров.
-- В матчинге не участвуют напрямую (семантика — в give_vector); это для показа.
-- Идемпотентно.

alter table users add column if not exists experiences jsonb default '[]'::jsonb;
alter table users add column if not exists projects    jsonb default '[]'::jsonb;
alter table users add column if not exists honors      jsonb default '[]'::jsonb;
