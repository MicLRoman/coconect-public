-- 007: WhatsApp onboarding conversation state.
-- Хранит позицию в диалоге и накопленные ответы до момента /smart_ingest.
-- Идемпотентно.

create table if not exists wa_conversations (
    phone      text primary key,
    step       integer     not null default 0,
    draft      jsonb       not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

create index if not exists idx_wa_conversations_updated
    on wa_conversations (updated_at);

-- RLS: как у остальных таблиц — включаем + permissive "service bypass" политика.
-- USING (true) у FOR ALL покрывает и INSERT (WITH CHECK берётся из USING).
alter table wa_conversations enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where tablename = 'wa_conversations' and policyname = 'Service bypass wa_conversations'
    ) then
        create policy "Service bypass wa_conversations" on wa_conversations using (true);
    end if;
end $$;
