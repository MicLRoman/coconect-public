-- 017: intent_tag — главный «чего хочет» пользователь (заполняется LLM). Идемпотентно.
-- (Таксономия значений и логика комплементарности — вырезано из публичной версии.)

alter table users add column if not exists intent_tag text default 'peer_network';

NOTIFY pgrst, 'reload schema';
