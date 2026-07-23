-- Provider and synchronization metadata
CREATE TYPE "EsportsProvider" AS ENUM ('MANUAL', 'LIQUIPEDIA');
CREATE TYPE "EsportsSyncStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED');

ALTER TABLE "BracketMatch" ADD COLUMN "esportsMatchId" TEXT;

ALTER TABLE "EsportsMatch"
ADD COLUMN "bestOf" INTEGER,
ADD COLUMN "externalId" TEXT,
ADD COLUMN "isBrazilFocused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN "provider" "EsportsProvider" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "region" TEXT NOT NULL DEFAULT 'GLOBAL',
ADD COLUMN "round" TEXT,
ADD COLUMN "sourceUrl" TEXT,
ADD COLUMN "stage" TEXT,
ADD COLUMN "streamUrl" TEXT,
ADD COLUMN "vodUrl" TEXT;

ALTER TABLE "EsportsPlayer"
ADD COLUMN "externalId" TEXT,
ADD COLUMN "provider" "EsportsProvider" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "sourceUrl" TEXT;

ALTER TABLE "EsportsTeam"
ADD COLUMN "externalId" TEXT,
ADD COLUMN "isBrazilian" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "provider" "EsportsProvider" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "sourceUrl" TEXT;

ALTER TABLE "News" ADD COLUMN "tournamentId" TEXT;

ALTER TABLE "Tournament"
ADD COLUMN "country" TEXT NOT NULL DEFAULT 'xx',
ADD COLUMN "externalId" TEXT,
ADD COLUMN "isBrazilFocused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN "provider" "EsportsProvider" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "region" TEXT NOT NULL DEFAULT 'GLOBAL',
ADD COLUMN "sourceUrl" TEXT;

-- The previous table contained only seed/demo rows and was not linked to users.
DROP TABLE "PickemUser";

CREATE TABLE "EsportsPickemEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "correctPicks" INTEGER NOT NULL DEFAULT 0,
    "totalPicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EsportsPickemEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EsportsPickemPrediction" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "predictedTeamId" TEXT,
    "predictedTeamName" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EsportsPickemPrediction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EsportsSyncRun" (
    "id" TEXT NOT NULL,
    "provider" "EsportsProvider" NOT NULL,
    "status" "EsportsSyncStatus" NOT NULL DEFAULT 'RUNNING',
    "games" JSONB NOT NULL DEFAULT '[]',
    "fetched" INTEGER NOT NULL DEFAULT 0,
    "accepted" INTEGER NOT NULL DEFAULT 0,
    "tournamentsUpserted" INTEGER NOT NULL DEFAULT 0,
    "teamsUpserted" INTEGER NOT NULL DEFAULT 0,
    "matchesUpserted" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    CONSTRAINT "EsportsSyncRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EsportsPickemEntry_tournamentId_score_idx" ON "EsportsPickemEntry"("tournamentId", "score");
CREATE UNIQUE INDEX "EsportsPickemEntry_userId_tournamentId_key" ON "EsportsPickemEntry"("userId", "tournamentId");
CREATE INDEX "EsportsPickemPrediction_matchId_idx" ON "EsportsPickemPrediction"("matchId");
CREATE INDEX "EsportsPickemPrediction_predictedTeamId_idx" ON "EsportsPickemPrediction"("predictedTeamId");
CREATE UNIQUE INDEX "EsportsPickemPrediction_entryId_matchId_key" ON "EsportsPickemPrediction"("entryId", "matchId");
CREATE INDEX "EsportsSyncRun_provider_startedAt_idx" ON "EsportsSyncRun"("provider", "startedAt");
CREATE INDEX "EsportsSyncRun_status_startedAt_idx" ON "EsportsSyncRun"("status", "startedAt");
CREATE UNIQUE INDEX "BracketMatch_esportsMatchId_key" ON "BracketMatch"("esportsMatchId");
CREATE INDEX "BracketMatch_esportsMatchId_idx" ON "BracketMatch"("esportsMatchId");
CREATE INDEX "EsportsMatch_isBrazilFocused_scheduledAt_idx" ON "EsportsMatch"("isBrazilFocused", "scheduledAt");
CREATE UNIQUE INDEX "EsportsMatch_provider_externalId_key" ON "EsportsMatch"("provider", "externalId");
CREATE UNIQUE INDEX "EsportsPlayer_provider_externalId_key" ON "EsportsPlayer"("provider", "externalId");
CREATE INDEX "EsportsTeam_isBrazilian_name_idx" ON "EsportsTeam"("isBrazilian", "name");
CREATE UNIQUE INDEX "EsportsTeam_provider_externalId_key" ON "EsportsTeam"("provider", "externalId");
CREATE INDEX "News_tournamentId_publishedAt_idx" ON "News"("tournamentId", "publishedAt");
CREATE INDEX "Tournament_isBrazilFocused_startAt_idx" ON "Tournament"("isBrazilFocused", "startAt");
CREATE UNIQUE INDEX "Tournament_provider_externalId_key" ON "Tournament"("provider", "externalId");

ALTER TABLE "News" ADD CONSTRAINT "News_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BracketMatch" ADD CONSTRAINT "BracketMatch_esportsMatchId_fkey" FOREIGN KEY ("esportsMatchId") REFERENCES "EsportsMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EsportsPickemEntry" ADD CONSTRAINT "EsportsPickemEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EsportsPickemEntry" ADD CONSTRAINT "EsportsPickemEntry_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EsportsPickemPrediction" ADD CONSTRAINT "EsportsPickemPrediction_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "EsportsPickemEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EsportsPickemPrediction" ADD CONSTRAINT "EsportsPickemPrediction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "EsportsMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EsportsPickemPrediction" ADD CONSTRAINT "EsportsPickemPrediction_predictedTeamId_fkey" FOREIGN KEY ("predictedTeamId") REFERENCES "EsportsTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve current curated Brazilian content in the focused feed.
UPDATE "EsportsTeam"
SET "isBrazilian" = true
WHERE lower("country") IN ('br', 'bra', 'brazil', 'brasil');

UPDATE "Tournament"
SET "isBrazilFocused" = true, "region" = 'BR', "country" = 'br'
WHERE coalesce("name", '') ~* '(brasil|brazil|cblol|lta south|cbcs|challengers brazil|game changers brazil)'
   OR coalesce("location", '') ~* '(brasil|brazil|sao paulo|são paulo|rio de janeiro)';

UPDATE "EsportsMatch" AS match
SET "isBrazilFocused" = true, "region" = 'BR'
WHERE coalesce(match."competition", '') ~* '(brasil|brazil|cblol|lta south|cbcs|challengers brazil|game changers brazil)'
   OR EXISTS (
       SELECT 1 FROM "Tournament" tournament
       WHERE tournament."id" = match."tournamentId" AND tournament."isBrazilFocused" = true
   )
   OR EXISTS (
       SELECT 1 FROM "EsportsTeam" team
       WHERE team."id" IN (match."teamAId", match."teamBId") AND team."isBrazilian" = true
   );
