-- 009: magic-link токены для входа в личный кабинет (ЛК).
-- Ссылка вида /lk?token=<opaque> вместо /lk?uid=... — не угадывается, доставляется
-- только в WhatsApp юзера. Токен постоянный (ссылка "закреплена", не протухает).
-- Идемпотентно.

create table if not exists lk_tokens (
    token      text primary key,
    user_id    text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_lk_tokens_user on lk_tokens (user_id);

alter table lk_tokens enable row level security;
do $$
begin
    if not exists (select 1 from pg_policies
                   where tablename = 'lk_tokens' and policyname = 'Service bypass lk_tokens') then
        create policy "Service bypass lk_tokens" on lk_tokens using (true);
    end if;
end $$;
