ALTER TABLE "Term" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Term_status_archivedAt_word_idx" ON "Term"("status", "archivedAt", "word");
