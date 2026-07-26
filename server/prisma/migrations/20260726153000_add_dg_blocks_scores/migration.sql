-- CreateTable
CREATE TABLE "TetrisBestScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "lines" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TetrisBestScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TetrisRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "score" INTEGER,
    "lines" INTEGER,
    "level" INTEGER,
    "durationMs" INTEGER,

    CONSTRAINT "TetrisRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TetrisBestScore_userId_key" ON "TetrisBestScore"("userId");

-- CreateIndex
CREATE INDEX "TetrisBestScore_score_lines_durationMs_achievedAt_idx" ON "TetrisBestScore"("score", "lines", "durationMs", "achievedAt");

-- CreateIndex
CREATE INDEX "TetrisRun_userId_startedAt_idx" ON "TetrisRun"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "TetrisRun_expiresAt_idx" ON "TetrisRun"("expiresAt");

-- AddForeignKey
ALTER TABLE "TetrisBestScore" ADD CONSTRAINT "TetrisBestScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TetrisRun" ADD CONSTRAINT "TetrisRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
