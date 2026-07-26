-- Replace the ambiguous verified flag with an explicit contribution lifecycle.
CREATE TYPE "TermStatus" AS ENUM ('PENDING', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED');
CREATE TYPE "TermModerationEventType" AS ENUM ('SUBMITTED', 'AUTHOR_UPDATED', 'CHANGES_REQUESTED', 'RESUBMITTED', 'APPROVED', 'REJECTED', 'MIGRATED');
CREATE TYPE "ContributionRejectionReason" AS ENUM ('DUPLICATE', 'INACCURATE', 'OUT_OF_SCOPE', 'INSUFFICIENT_DETAIL', 'INAPPROPRIATE', 'SPAM', 'OTHER');
CREATE TYPE "NotificationType" AS ENUM ('CONTRIBUTION_APPROVED', 'CONTRIBUTION_REJECTED', 'CONTRIBUTION_CHANGES_REQUESTED');
CREATE TYPE "NotificationEmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

ALTER TABLE "Term"
ADD COLUMN "status" "TermStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "moderatedAt" TIMESTAMP(3);

UPDATE "Term"
SET "status" = CASE WHEN "verified" THEN 'APPROVED'::"TermStatus" ELSE 'PENDING'::"TermStatus" END,
    "moderatedAt" = CASE WHEN "verified" THEN "updatedAt" ELSE NULL END;

-- Preserve legacy Contribution rows. Exact content already represented by a Term
-- is not duplicated, while invalid legacy game references are safely cleared.
INSERT INTO "Term" (
    "id", "word", "definition", "examples", "gameId", "upvotes", "downvotes",
    "tags", "verified", "status", "revision", "moderatedAt", "authorId", "createdAt", "updatedAt"
)
SELECT
    CASE WHEN existing_id."id" IS NULL THEN c."id" ELSE 'legacy-contribution-' || c."id" END,
    c."word",
    c."definition",
    '[]'::jsonb,
    g."id",
    0,
    0,
    '[]'::jsonb,
    UPPER(c."status") = 'APPROVED',
    CASE
        WHEN UPPER(c."status") = 'APPROVED' THEN 'APPROVED'::"TermStatus"
        WHEN UPPER(c."status") = 'REJECTED' THEN 'REJECTED'::"TermStatus"
        ELSE 'PENDING'::"TermStatus"
    END,
    1,
    CASE WHEN UPPER(c."status") IN ('APPROVED', 'REJECTED') THEN c."updatedAt" ELSE NULL END,
    c."authorId",
    c."createdAt",
    c."updatedAt"
FROM "Contribution" c
LEFT JOIN "Game" g ON g."id" = c."gameId"
LEFT JOIN "Term" existing_id ON existing_id."id" = c."id"
WHERE NOT EXISTS (
    SELECT 1
    FROM "Term" t
    WHERE public.dicionario_normalize(t."word") = public.dicionario_normalize(c."word")
      AND public.dicionario_normalize(t."definition") = public.dicionario_normalize(c."definition")
      AND t."authorId" IS NOT DISTINCT FROM c."authorId"
);

CREATE TABLE "TermModerationEvent" (
    "id" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "TermModerationEventType" NOT NULL,
    "fromStatus" "TermStatus",
    "toStatus" "TermStatus" NOT NULL,
    "revision" INTEGER NOT NULL,
    "authorMessage" TEXT,
    "internalNote" TEXT,
    "rejectionReason" "ContributionRejectionReason",
    "snapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TermModerationEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "termId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "emailStatus" "NotificationEmailStatus" NOT NULL DEFAULT 'SKIPPED',
    "emailSentAt" TIMESTAMP(3),
    "emailError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Every migrated term starts with an honest baseline event. Runtime-created
-- contributions use SUBMITTED instead.
INSERT INTO "TermModerationEvent" (
    "id", "termId", "actorId", "type", "fromStatus", "toStatus", "revision", "snapshot", "createdAt"
)
SELECT
    'migrated-' || t."id",
    t."id",
    t."authorId",
    'MIGRATED'::"TermModerationEventType",
    NULL,
    t."status",
    t."revision",
    jsonb_build_object(
        'word', t."word",
        'definition', t."definition",
        'gameId', t."gameId",
        'examples', t."examples",
        'tags', t."tags"
    ),
    t."createdAt"
FROM "Term" t;

DROP INDEX IF EXISTS "Term_verified_idx";
DROP INDEX IF EXISTS "Term_verified_createdAt_idx";
DROP INDEX IF EXISTS "Term_verified_upvotes_idx";

ALTER TABLE "Term" DROP COLUMN "verified";
DROP TABLE "Contribution";

CREATE INDEX "Term_status_idx" ON "Term"("status");
CREATE INDEX "Term_status_createdAt_idx" ON "Term"("status", "createdAt");
CREATE INDEX "Term_status_upvotes_idx" ON "Term"("status", "upvotes");
CREATE INDEX "TermModerationEvent_termId_createdAt_idx" ON "TermModerationEvent"("termId", "createdAt");
CREATE INDEX "TermModerationEvent_actorId_createdAt_idx" ON "TermModerationEvent"("actorId", "createdAt");
CREATE INDEX "TermModerationEvent_type_createdAt_idx" ON "TermModerationEvent"("type", "createdAt");
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_emailStatus_createdAt_idx" ON "Notification"("emailStatus", "createdAt");
CREATE INDEX "Notification_termId_idx" ON "Notification"("termId");

ALTER TABLE "TermModerationEvent" ADD CONSTRAINT "TermModerationEvent_termId_fkey"
FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TermModerationEvent" ADD CONSTRAINT "TermModerationEvent_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_termId_fkey"
FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE SET NULL ON UPDATE CASCADE;
