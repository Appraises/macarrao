CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "NewsStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

ALTER TABLE "Game"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "GameMap"
  ADD COLUMN "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "News"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "status" "NewsStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "scheduledAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "seoTitle" TEXT,
  ADD COLUMN "seoDescription" TEXT,
  ADD COLUMN "createdById" TEXT;

UPDATE "News"
SET
  "slug" = TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE("headline", '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || SUBSTRING("id", 1, 8),
  "status" = 'PUBLISHED',
  "publishedAt" = "createdAt";

ALTER TABLE "News" ALTER COLUMN "slug" SET NOT NULL;

CREATE TABLE "AdminAuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "News_slug_key" ON "News"("slug");
CREATE INDEX "News_status_publishedAt_idx" ON "News"("status", "publishedAt");
CREATE INDEX "News_createdById_idx" ON "News"("createdById");
CREATE INDEX "GameMap_status_createdAt_idx" ON "GameMap"("status", "createdAt");
CREATE UNIQUE INDEX "GameMap_gameId_name_key" ON "GameMap"("gameId", "name");
CREATE INDEX "AdminAuditLog_actorId_createdAt_idx" ON "AdminAuditLog"("actorId", "createdAt");
CREATE INDEX "AdminAuditLog_entityType_entityId_idx" ON "AdminAuditLog"("entityType", "entityId");
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

ALTER TABLE "News"
  ADD CONSTRAINT "News_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdminAuditLog"
  ADD CONSTRAINT "AdminAuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
