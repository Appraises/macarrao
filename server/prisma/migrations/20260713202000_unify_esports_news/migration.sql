INSERT INTO "News" (
  "id", "headline", "slug", "category", "image", "content", "author",
  "status", "publishedAt", "createdAt", "updatedAt"
)
SELECT
  e."id",
  e."headline",
  TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE(e."headline", '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || SUBSTRING(e."id", 1, 8),
  'E-Sports',
  e."image",
  NULL,
  e."author",
  'PUBLISHED'::"NewsStatus",
  e."createdAt",
  e."createdAt",
  e."createdAt"
FROM "EsportsNews" e
WHERE NOT EXISTS (SELECT 1 FROM "News" n WHERE n."id" = e."id");
