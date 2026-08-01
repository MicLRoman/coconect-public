-- Promo codes for granting subscription tiers.
-- Run once in the Supabase SQL editor.
create table if not exists public.promo_codes (
    id                uuid primary key default gen_random_uuid(),
    code              text not null unique,
    subscription_tier text not null,          -- 'Starter' | 'Core Membership' | 'Premium'
    max_uses          integer,                 -- null = unlimited
    used_count        integer not null default 0,
    duration_days     integer,                 -- null = forever; else tier lasts this many days then downgrades
    created_at        timestamptz not null default now()
);

create unique index if not exists promo_codes_code_idx on public.promo_codes (upper(code));
