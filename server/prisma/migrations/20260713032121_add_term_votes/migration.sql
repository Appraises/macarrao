-- CreateTable
CREATE TABLE "TermVote" (
    "id" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TermVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TermVote_termId_idx" ON "TermVote"("termId");

-- CreateIndex
CREATE UNIQUE INDEX "TermVote_termId_userId_key" ON "TermVote"("termId", "userId");

-- AddForeignKey
ALTER TABLE "TermVote" ADD CONSTRAINT "TermVote_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermVote" ADD CONSTRAINT "TermVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
