-- Replace the discarded falling-block concept while preserving any local scores.
ALTER TABLE "TetrisBestScore" RENAME TO "BrickBreakerBestScore";
ALTER TABLE "TetrisRun" RENAME TO "BrickBreakerRun";

ALTER TABLE "BrickBreakerBestScore" RENAME COLUMN "lines" TO "bricksDestroyed";
ALTER TABLE "BrickBreakerRun" RENAME COLUMN "lines" TO "bricksDestroyed";

ALTER INDEX "TetrisBestScore_userId_key" RENAME TO "BrickBreakerBestScore_userId_key";
ALTER INDEX "TetrisBestScore_score_lines_durationMs_achievedAt_idx"
    RENAME TO "BrickBreakerBestScore_score_bricksDestroyed_durationMs_achievedAt_idx";
ALTER INDEX "TetrisRun_userId_startedAt_idx" RENAME TO "BrickBreakerRun_userId_startedAt_idx";
ALTER INDEX "TetrisRun_expiresAt_idx" RENAME TO "BrickBreakerRun_expiresAt_idx";

ALTER TABLE "BrickBreakerBestScore"
    RENAME CONSTRAINT "TetrisBestScore_pkey" TO "BrickBreakerBestScore_pkey";
ALTER TABLE "BrickBreakerBestScore"
    RENAME CONSTRAINT "TetrisBestScore_userId_fkey" TO "BrickBreakerBestScore_userId_fkey";
ALTER TABLE "BrickBreakerRun"
    RENAME CONSTRAINT "TetrisRun_pkey" TO "BrickBreakerRun_pkey";
ALTER TABLE "BrickBreakerRun"
    RENAME CONSTRAINT "TetrisRun_userId_fkey" TO "BrickBreakerRun_userId_fkey";
