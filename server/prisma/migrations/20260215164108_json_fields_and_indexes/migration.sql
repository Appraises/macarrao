/*
  Warnings:

  - You are about to drop the column `author` on the `Contribution` table. All the data in the column will be lost.
  - The `examples` column on the `Term` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tags` column on the `Term` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `relatedTerms` column on the `Term` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Contribution" DROP COLUMN "author",
ADD COLUMN     "authorId" TEXT;

-- AlterTable
ALTER TABLE "Term" ADD COLUMN     "authorId" TEXT,
DROP COLUMN "examples",
ADD COLUMN     "examples" JSONB NOT NULL DEFAULT '[]',
DROP COLUMN "tags",
ADD COLUMN     "tags" JSONB NOT NULL DEFAULT '[]',
DROP COLUMN "relatedTerms",
ADD COLUMN     "relatedTerms" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "badges" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "favoriteGameId" TEXT,
ADD COLUMN     "preferences" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "resetPasswordExpires" TIMESTAMP(3),
ADD COLUMN     "resetPasswordToken" TEXT,
ADD COLUMN     "verificationToken" TEXT,
ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "GameMap" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "tacticalImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapCallout" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapCallout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TermView" (
    "id" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TermView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "newsId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameMap_gameId_idx" ON "GameMap"("gameId");

-- CreateIndex
CREATE INDEX "MapCallout_mapId_idx" ON "MapCallout"("mapId");

-- CreateIndex
CREATE INDEX "TermView_termId_createdAt_idx" ON "TermView"("termId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_newsId_idx" ON "Comment"("newsId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Contribution_status_idx" ON "Contribution"("status");

-- CreateIndex
CREATE INDEX "Contribution_authorId_idx" ON "Contribution"("authorId");

-- CreateIndex
CREATE INDEX "News_category_idx" ON "News"("category");

-- CreateIndex
CREATE INDEX "Term_word_idx" ON "Term"("word");

-- CreateIndex
CREATE INDEX "Term_gameId_idx" ON "Term"("gameId");

-- CreateIndex
CREATE INDEX "Term_verified_idx" ON "Term"("verified");

-- CreateIndex
CREATE INDEX "Term_authorId_idx" ON "Term"("authorId");

-- CreateIndex
CREATE INDEX "Term_createdAt_idx" ON "Term"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_favoriteGameId_fkey" FOREIGN KEY ("favoriteGameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameMap" ADD CONSTRAINT "GameMap_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapCallout" ADD CONSTRAINT "MapCallout_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "GameMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Term" ADD CONSTRAINT "Term_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermView" ADD CONSTRAINT "TermView_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
