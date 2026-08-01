-- 008: LinkedIn-first onboarding.
-- GIVE приходит из LinkedIn-парсинга на сайте; ASK + психотип — в WhatsApp.
-- Идемпотентно.

alter table users add column if not exists linkedin_url      text;
alter table users add column if not exists gender            text;       -- {male|female|unknown}
alter table users add column if not exists gender_confidence real default 0;
alter table users add column if not exists onboarding_stage  text default 'new';
--   onboarding_stage: new -> web_done (GIVE собран, ждём ASK в WhatsApp) -> completed

-- Возраст на веб-шаге не собираем (LinkedIn точного не даёт). Снимаем NOT NULL,
-- который навесила 003_user_age — иначе web_start падает на upsert.
alter table users alter column age drop not null;
