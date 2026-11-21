CREATE TYPE "NewsSocialChannel" AS ENUM ('INSTAGRAM', 'X');
CREATE TYPE "NewsSocialStatus" AS ENUM ('PENDING', 'PREPARING', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'REVIEW', 'CANCELED');

CREATE TABLE "NewsSocialPost" (
    "id" TEXT NOT NULL,
    "newsId" TEXT NOT NULL,
    "channel" "NewsSocialChannel" NOT NULL,
    "status" "NewsSocialStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "providerMediaId" TEXT,
    "providerPostId" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    CONSTRAINT "NewsSocialPost_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "NewsSocialPost_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "NewsSocialPost_newsId_channel_key" ON "NewsSocialPost"("newsId", "channel");
CREATE INDEX "NewsSocialPost_channel_status_nextAttemptAt_idx" ON "NewsSocialPost"("channel", "status", "nextAttemptAt");
