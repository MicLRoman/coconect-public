-- 015: флаг рассылки айсбрейкеров (новый lifecycle-месседж в момент ивента).
-- Идемпотентно.

alter table event_rsvps add column if not exists notified_icebreakers boolean default false;

NOTIFY pgrst, 'reload schema';
