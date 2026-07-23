-- AlterTable
ALTER TABLE "Term" ADD COLUMN     "gameIds" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "TermVote" ADD COLUMN     "meaningId" TEXT;

-- CreateTable
CREATE TABLE "TermMeaning" (
    "id" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "examples" JSONB NOT NULL DEFAULT '[]',
    "gameId" TEXT,
    "context" TEXT,
    "order" INTEGER NOT NULL DEFAULT 1,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "status" "TermStatus" NOT NULL DEFAULT 'PENDING',
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TermMeaning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TermMeaning_termId_order_idx" ON "TermMeaning"("termId", "order");

-- CreateIndex
CREATE INDEX "TermMeaning_termId_status_idx" ON "TermMeaning"("termId", "status");

-- CreateIndex
CREATE INDEX "TermMeaning_gameId_idx" ON "TermMeaning"("gameId");

-- CreateIndex
CREATE INDEX "TermMeaning_authorId_idx" ON "TermMeaning"("authorId");

-- CreateIndex
CREATE INDEX "TermVote_meaningId_idx" ON "TermVote"("meaningId");

-- AddForeignKey
ALTER TABLE "TermMeaning" ADD CONSTRAINT "TermMeaning_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermMeaning" ADD CONSTRAINT "TermMeaning_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermMeaning" ADD CONSTRAINT "TermMeaning_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermVote" ADD CONSTRAINT "TermVote_meaningId_fkey" FOREIGN KEY ("meaningId") REFERENCES "TermMeaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Backfill: every existing term becomes its own first meaning (order 1),
-- inheriting definition, examples, game, score, status and author. Legacy
-- columns on "Term" stay in place and keep being read, so nothing breaks.
-- ---------------------------------------------------------------------------
INSERT INTO "TermMeaning" (
    "id", "termId", "definition", "examples", "gameId", "order",
    "upvotes", "downvotes", "status", "authorId", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid(),
    t."id",
    t."definition",
    CASE WHEN jsonb_typeof(t."examples") = 'array' THEN t."examples" ELSE '[]'::jsonb END,
    t."gameId",
    1,
    t."upvotes",
    t."downvotes",
    t."status",
    t."authorId",
    t."createdAt",
    t."updatedAt"
FROM "Term" AS t
WHERE NOT EXISTS (SELECT 1 FROM "TermMeaning" AS m WHERE m."termId" = t."id");

-- Existing votes belong to that first meaning.
UPDATE "TermVote" AS v
SET "meaningId" = m."id"
FROM "TermMeaning" AS m
WHERE m."termId" = v."termId" AND m."order" = 1 AND v."meaningId" IS NULL;

-- Denormalized game list used by the catalog filters.
UPDATE "Term" AS t
SET "gameIds" = COALESCE((
    SELECT jsonb_agg(DISTINCT m."gameId")
    FROM "TermMeaning" AS m
    WHERE m."termId" = t."id" AND m."gameId" IS NOT NULL
), '[]'::jsonb);
