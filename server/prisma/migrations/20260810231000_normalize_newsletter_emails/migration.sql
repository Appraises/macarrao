-- Email local-parts are treated case-insensitively by the newsletter contract.
-- Keep the oldest consent record and normalize legacy rows before new signups.
WITH ranked_subscribers AS (
  SELECT "id",
         ROW_NUMBER() OVER (
           PARTITION BY LOWER(TRIM("email"))
           ORDER BY "consentAt" ASC, "createdAt" ASC, "id" ASC
         ) AS duplicate_rank
  FROM "NewsletterSubscriber"
)
DELETE FROM "NewsletterSubscriber"
WHERE "id" IN (
  SELECT "id" FROM ranked_subscribers WHERE duplicate_rank > 1
);

UPDATE "NewsletterSubscriber"
SET "email" = LOWER(TRIM("email"));
