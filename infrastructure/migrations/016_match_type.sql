-- 016: match_type — нормализованный LLM-классификатором тип метча. Идемпотентно.
-- (Таксономия значений и роль в скоринге — вырезано из публичной версии.)

alter table users add column if not exists match_type text default 'peer';

NOTIFY pgrst, 'reload schema';
