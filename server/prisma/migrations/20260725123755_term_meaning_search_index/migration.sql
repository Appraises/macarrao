-- Search now scans every approved sense (TermMeaning.definition) and the inflected
-- forms stored in JSONB, but only "Term" had trigram indexes — so those lookups fell
-- back to a sequential scan. This mirrors the existing Term index.
--
-- Note: no extra (status, termId) index is needed. The subquery filters
-- `m."termId" = t."id" AND m."status" = 'APPROVED'`, which the model's existing
-- @@index([termId, status]) already serves.
CREATE INDEX IF NOT EXISTS "TermMeaning_definition_trgm_idx"
  ON "TermMeaning" USING GIN (public.dicionario_normalize("definition") gin_trgm_ops);
