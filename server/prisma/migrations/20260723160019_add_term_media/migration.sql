-- CreateEnum
CREATE TYPE "TermMediaKind" AS ENUM ('ORIGIN', 'IMAGE');

-- AlterTable
ALTER TABLE "Term" ADD COLUMN     "origin" TEXT,
ADD COLUMN     "originHidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TermMedia" (
    "id" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "kind" "TermMediaKind" NOT NULL,
    "content" TEXT,
    "url" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "TermStatus" NOT NULL DEFAULT 'PENDING',
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TermMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TermMedia_termId_kind_status_idx" ON "TermMedia"("termId", "kind", "status");

-- CreateIndex
CREATE INDEX "TermMedia_status_idx" ON "TermMedia"("status");

-- CreateIndex
CREATE INDEX "TermMedia_authorId_idx" ON "TermMedia"("authorId");

-- AddForeignKey
ALTER TABLE "TermMedia" ADD CONSTRAINT "TermMedia_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermMedia" ADD CONSTRAINT "TermMedia_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

