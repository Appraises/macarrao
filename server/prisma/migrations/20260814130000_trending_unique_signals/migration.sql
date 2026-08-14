-- Anonymous, signed-browser deduplication for term engagement signals.
ALTER TABLE "TermView"
    ADD COLUMN "viewerHash" VARCHAR(64),
    ADD COLUMN "dedupeBucket" TIMESTAMP(3);

CREATE UNIQUE INDEX "TermView_termId_viewerHash_dedupeBucket_key"
    ON "TermView"("termId", "viewerHash", "dedupeBucket");
CREATE INDEX "TermView_viewerHash_createdAt_idx"
    ON "TermView"("viewerHash", "createdAt");

CREATE TABLE "TermShare" (
    "id" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "viewerHash" VARCHAR(64) NOT NULL,
    "dedupeBucket" TIMESTAMP(3) NOT NULL,
    "method" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TermShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TermShare_termId_viewerHash_dedupeBucket_key"
    ON "TermShare"("termId", "viewerHash", "dedupeBucket");
CREATE INDEX "TermShare_termId_createdAt_idx"
    ON "TermShare"("termId", "createdAt");
CREATE INDEX "TermShare_viewerHash_createdAt_idx"
    ON "TermShare"("viewerHash", "createdAt");
CREATE INDEX "InternalSearchEvent_openedTermId_openedAt_idx"
    ON "InternalSearchEvent"("openedTermId", "openedAt");
CREATE INDEX "TermVote_termId_updatedAt_idx"
    ON "TermVote"("termId", "updatedAt");

ALTER TABLE "TermShare"
    ADD CONSTRAINT "TermShare_termId_fkey"
    FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;
