CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.dicionario_normalize(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
    SELECT lower(regexp_replace(public.unaccent('public.unaccent', input), '\s+', ' ', 'g'));
$$;

CREATE INDEX IF NOT EXISTS "Term_word_search_trgm_idx"
ON "Term" USING GIN (public.dicionario_normalize("word") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Term_definition_search_trgm_idx"
ON "Term" USING GIN (public.dicionario_normalize("definition") gin_trgm_ops);
