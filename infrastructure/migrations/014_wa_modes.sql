-- 014: режим диалога WhatsApp для ответов на lifecycle-уведомления.
--   mode: null|onboarding | rsvp | confirm | feedback_l1 | feedback_l2
--   context: jsonb с event_id/rsvp_id и промежуточными данными (рейтинг L1 и т.п.)
-- Демон (lifecycle) ставит mode при отправке сообщения, dialog роутит ответ.
-- Идемпотентно.

alter table wa_conversations add column if not exists mode    text;
alter table wa_conversations add column if not exists context jsonb default '{}'::jsonb;

NOTIFY pgrst, 'reload schema';
