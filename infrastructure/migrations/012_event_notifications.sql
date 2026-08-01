-- 012: флаги lifecycle-уведомлений WhatsApp (чтобы демон слал каждое ОДИН раз).
-- T-72h «стол готов» → T-24h «подтверди» → во время ивента «афтерпати» → T+12h «фидбек».
-- Идемпотентно.

alter table event_rsvps add column if not exists notified_ready      boolean default false;
alter table event_rsvps add column if not exists notified_confirm    boolean default false;
alter table event_rsvps add column if not exists notified_afterparty boolean default false;
alter table event_rsvps add column if not exists notified_feedback   boolean default false;

-- адрес/место афтерпати на событии (опционально)
alter table events add column if not exists afterparty_location text;
