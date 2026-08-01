-- 010: язык интерфейса/диалога пользователя (выбор на вебе: ru | en).
-- Идемпотентно.

alter table users add column if not exists lang text default 'ru';
