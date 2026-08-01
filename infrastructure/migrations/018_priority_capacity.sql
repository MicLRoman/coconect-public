-- 018: priority (юзер) + capacity (ивент) для overflow/waitlist.
--  users.priority  — приоритетный гость: при нехватке мест садится первым,
--                    остальные сверх capacity уходят в overflow.
--  events.capacity — лимит посадочных мест (NULL = без лимита, как сейчас).
-- Идемпотентно.

alter table users  add column if not exists priority boolean default false;
alter table events add column if not exists capacity integer;

NOTIFY pgrst, 'reload schema';
