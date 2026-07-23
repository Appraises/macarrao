CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LIVE', 'FINISHED', 'CANCELED');

ALTER TABLE "Tournament"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "gameId" TEXT,
  ADD COLUMN "startAt" TIMESTAMP(3),
  ADD COLUMN "endAt" TIMESTAMP(3),
  ADD COLUMN "publicationStatus" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "archivedAt" TIMESTAMP(3);

UPDATE "Tournament"
SET "slug" = TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || SUBSTRING("id", 1, 8);

ALTER TABLE "Tournament" ALTER COLUMN "slug" SET NOT NULL;

CREATE TABLE "EsportsTeam" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "country" TEXT NOT NULL DEFAULT 'xx',
  "logo" TEXT,
  "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EsportsTeam_pkey" PRIMARY KEY ("id")
);

WITH team_names AS (
  SELECT "name", "country" FROM "TournamentTeam"
  UNION ALL SELECT "teamName", "teamCountry" FROM "TournamentStanding"
  UNION ALL SELECT "teamAName", "teamACountry" FROM "EsportsMatch"
  UNION ALL SELECT "teamBName", "teamBCountry" FROM "EsportsMatch"
  UNION ALL SELECT "teamName", "teamCountry" FROM "TeamRanking"
  UNION ALL SELECT "team", "country" FROM "PlayerStat"
), normalized AS (
  SELECT "name", MIN(COALESCE(NULLIF("country", ''), 'xx')) AS "country"
  FROM team_names
  WHERE "name" IS NOT NULL AND TRIM("name") <> '' AND LOWER(TRIM("name")) <> 'tbd'
  GROUP BY "name"
)
INSERT INTO "EsportsTeam" ("id", "name", "slug", "country")
SELECT
  SUBSTRING(MD5(LOWER("name")), 1, 8) || '-' || SUBSTRING(MD5(LOWER("name")), 9, 4) || '-' ||
  SUBSTRING(MD5(LOWER("name")), 13, 4) || '-' || SUBSTRING(MD5(LOWER("name")), 17, 4) || '-' ||
  SUBSTRING(MD5(LOWER("name")), 21, 12),
  "name",
  TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || SUBSTRING(MD5(LOWER("name")), 1, 6),
  "country"
FROM normalized;

CREATE TABLE "EsportsPlayer" (
  "id" TEXT NOT NULL,
  "teamId" TEXT,
  "name" TEXT NOT NULL,
  "nickname" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "country" TEXT NOT NULL DEFAULT 'xx',
  "role" TEXT,
  "photo" TEXT,
  "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EsportsPlayer_pkey" PRIMARY KEY ("id")
);

WITH players AS (
  SELECT "name", MIN("team") AS "team", MIN(COALESCE(NULLIF("country", ''), 'xx')) AS "country",
    MIN("role") AS "role", MIN("photo") AS "photo"
  FROM "PlayerStat"
  WHERE "name" IS NOT NULL AND TRIM("name") <> ''
  GROUP BY "name"
)
INSERT INTO "EsportsPlayer" ("id", "teamId", "name", "nickname", "slug", "country", "role", "photo")
SELECT
  SUBSTRING(MD5(LOWER(p."name")), 1, 8) || '-' || SUBSTRING(MD5(LOWER(p."name")), 9, 4) || '-' ||
  SUBSTRING(MD5(LOWER(p."name")), 13, 4) || '-' || SUBSTRING(MD5(LOWER(p."name")), 17, 4) || '-' ||
  SUBSTRING(MD5(LOWER(p."name")), 21, 12),
  t."id",
  p."name",
  p."name",
  TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE(p."name", '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || SUBSTRING(MD5(LOWER(p."name")), 1, 6),
  p."country",
  p."role",
  p."photo"
FROM players p
LEFT JOIN "EsportsTeam" t ON LOWER(t."name") = LOWER(p."team");

ALTER TABLE "TournamentTeam" ADD COLUMN "teamId" TEXT;
ALTER TABLE "TournamentStanding" ADD COLUMN "teamId" TEXT;
ALTER TABLE "BracketMatch" ADD COLUMN "teamAId" TEXT, ADD COLUMN "teamBId" TEXT;

ALTER TABLE "EsportsMatch"
  ADD COLUMN "gameId" TEXT,
  ADD COLUMN "tournamentId" TEXT,
  ADD COLUMN "teamAId" TEXT,
  ADD COLUMN "teamBId" TEXT,
  ADD COLUMN "scheduledAt" TIMESTAMP(3),
  ADD COLUMN "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
  ADD COLUMN "publicationStatus" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "TeamRanking"
  ADD COLUMN "gameId" TEXT,
  ADD COLUMN "teamId" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "PlayerStat" ADD COLUMN "playerId" TEXT;

UPDATE "Tournament" t SET "gameId" = g."id"
FROM "Game" g
WHERE LOWER(g."name") = LOWER(t."game") OR LOWER(g."slug") = LOWER(t."game");

UPDATE "TournamentTeam" x SET "teamId" = t."id" FROM "EsportsTeam" t WHERE LOWER(t."name") = LOWER(x."name");
UPDATE "TournamentStanding" x SET "teamId" = t."id" FROM "EsportsTeam" t WHERE LOWER(t."name") = LOWER(x."teamName");
UPDATE "BracketMatch" x SET "teamAId" = t."id" FROM "EsportsTeam" t WHERE LOWER(t."name") = LOWER(x."teamAName");
UPDATE "BracketMatch" x SET "teamBId" = t."id" FROM "EsportsTeam" t WHERE LOWER(t."name") = LOWER(x."teamBName");
UPDATE "EsportsMatch" x SET "teamAId" = t."id" FROM "EsportsTeam" t WHERE LOWER(t."name") = LOWER(x."teamAName");
UPDATE "EsportsMatch" x SET "teamBId" = t."id" FROM "EsportsTeam" t WHERE LOWER(t."name") = LOWER(x."teamBName");
UPDATE "TeamRanking" x SET "teamId" = t."id" FROM "EsportsTeam" t WHERE LOWER(t."name") = LOWER(x."teamName");
UPDATE "PlayerStat" x SET "playerId" = p."id" FROM "EsportsPlayer" p WHERE LOWER(p."name") = LOWER(x."name");

UPDATE "EsportsMatch" SET "status" = CASE
  WHEN "isLive" THEN 'LIVE'::"MatchStatus"
  WHEN LOWER(COALESCE("time", '')) = 'completed' THEN 'FINISHED'::"MatchStatus"
  ELSE 'SCHEDULED'::"MatchStatus" END;

UPDATE "EsportsMatch" x SET "gameId" = g."id" FROM "Game" g
WHERE LOWER(g."name") = LOWER(x."game") OR LOWER(g."slug") = LOWER(x."game")
  OR (LOWER(x."game") = 'counter-strike 2' AND g."slug" = 'cs2');

UPDATE "TeamRanking" x SET "gameId" = g."id" FROM "Game" g
WHERE LOWER(g."name") = LOWER(x."game") OR LOWER(g."slug") = LOWER(x."game")
  OR (LOWER(x."game") = 'counter-strike 2' AND g."slug" = 'cs2');

CREATE UNIQUE INDEX "Tournament_slug_key" ON "Tournament"("slug");
CREATE INDEX "Tournament_gameId_idx" ON "Tournament"("gameId");
CREATE INDEX "Tournament_publicationStatus_startAt_idx" ON "Tournament"("publicationStatus", "startAt");
CREATE UNIQUE INDEX "EsportsTeam_slug_key" ON "EsportsTeam"("slug");
CREATE INDEX "EsportsTeam_status_name_idx" ON "EsportsTeam"("status", "name");
CREATE UNIQUE INDEX "EsportsPlayer_slug_key" ON "EsportsPlayer"("slug");
CREATE INDEX "EsportsPlayer_teamId_idx" ON "EsportsPlayer"("teamId");
CREATE INDEX "EsportsPlayer_status_nickname_idx" ON "EsportsPlayer"("status", "nickname");
CREATE INDEX "TournamentTeam_teamId_idx" ON "TournamentTeam"("teamId");
CREATE UNIQUE INDEX "TournamentTeam_tournamentId_name_key" ON "TournamentTeam"("tournamentId", "name");
CREATE INDEX "TournamentStanding_teamId_idx" ON "TournamentStanding"("teamId");
CREATE UNIQUE INDEX "TournamentStanding_tournamentId_rank_key" ON "TournamentStanding"("tournamentId", "rank");
CREATE INDEX "BracketMatch_teamAId_idx" ON "BracketMatch"("teamAId");
CREATE INDEX "BracketMatch_teamBId_idx" ON "BracketMatch"("teamBId");
CREATE UNIQUE INDEX "BracketMatch_tournamentId_matchKey_key" ON "BracketMatch"("tournamentId", "matchKey");
CREATE INDEX "EsportsMatch_gameId_idx" ON "EsportsMatch"("gameId");
CREATE INDEX "EsportsMatch_tournamentId_idx" ON "EsportsMatch"("tournamentId");
CREATE INDEX "EsportsMatch_teamAId_idx" ON "EsportsMatch"("teamAId");
CREATE INDEX "EsportsMatch_teamBId_idx" ON "EsportsMatch"("teamBId");
CREATE INDEX "EsportsMatch_publicationStatus_scheduledAt_idx" ON "EsportsMatch"("publicationStatus", "scheduledAt");
CREATE INDEX "TeamRanking_gameId_idx" ON "TeamRanking"("gameId");
CREATE INDEX "TeamRanking_teamId_idx" ON "TeamRanking"("teamId");
CREATE UNIQUE INDEX "TeamRanking_gameId_rank_key" ON "TeamRanking"("gameId", "rank");
CREATE UNIQUE INDEX "TeamRanking_gameId_teamId_key" ON "TeamRanking"("gameId", "teamId");
CREATE INDEX "PlayerStat_playerId_idx" ON "PlayerStat"("playerId");

ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EsportsTeam" ADD CONSTRAINT "EsportsTeam_dummy_check" CHECK (LENGTH(TRIM("name")) > 0);
ALTER TABLE "EsportsPlayer" ADD CONSTRAINT "EsportsPlayer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "EsportsTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "EsportsTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TournamentStanding" ADD CONSTRAINT "TournamentStanding_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "EsportsTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BracketMatch" ADD CONSTRAINT "BracketMatch_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "EsportsTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BracketMatch" ADD CONSTRAINT "BracketMatch_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "EsportsTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EsportsMatch" ADD CONSTRAINT "EsportsMatch_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EsportsMatch" ADD CONSTRAINT "EsportsMatch_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EsportsMatch" ADD CONSTRAINT "EsportsMatch_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "EsportsTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EsportsMatch" ADD CONSTRAINT "EsportsMatch_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "EsportsTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeamRanking" ADD CONSTRAINT "TeamRanking_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeamRanking" ADD CONSTRAINT "TeamRanking_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "EsportsTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlayerStat" ADD CONSTRAINT "PlayerStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "EsportsPlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
