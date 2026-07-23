-- Votes move from the term to the individual sense (what actually ranks meanings).

-- Defensive backfill: any vote still without a sense attaches to the leading one.
UPDATE "TermVote" AS v
SET "meaningId" = m."id"
FROM "TermMeaning" AS m
WHERE m."termId" = v."termId" AND m."order" = 1 AND v."meaningId" IS NULL;

-- A vote that cannot be attached to any sense is meaningless — drop it.
DELETE FROM "TermVote" WHERE "meaningId" IS NULL;

-- Swap the uniqueness rule: one vote per user per SENSE, not per term.
DROP INDEX "TermVote_termId_userId_key";
ALTER TABLE "TermVote" ALTER COLUMN "meaningId" SET NOT NULL;
CREATE UNIQUE INDEX "TermVote_meaningId_userId_key" ON "TermVote"("meaningId", "userId");
