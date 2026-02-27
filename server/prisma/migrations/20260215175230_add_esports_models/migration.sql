-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "logo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Upcoming',
    "dates" TEXT,
    "prizePool" TEXT,
    "image" TEXT,
    "description" TEXT,
    "organizer" TEXT,
    "location" TEXT,
    "format" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentTeam" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'xx',

    CONSTRAINT "TournamentTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentStanding" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "teamName" TEXT NOT NULL,
    "teamCountry" TEXT NOT NULL DEFAULT 'xx',
    "teamLogo" TEXT,
    "played" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "diff" INTEGER NOT NULL DEFAULT 0,
    "streak" TEXT,

    CONSTRAINT "TournamentStanding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BracketMatch" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "matchKey" TEXT NOT NULL,
    "round" TEXT NOT NULL,
    "teamAName" TEXT NOT NULL,
    "teamAScore" INTEGER,
    "teamAWinner" BOOLEAN NOT NULL DEFAULT false,
    "teamBName" TEXT NOT NULL,
    "teamBScore" INTEGER,
    "teamBWinner" BOOLEAN NOT NULL DEFAULT false,
    "date" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Scheduled',

    CONSTRAINT "BracketMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsportsMatch" (
    "id" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "competition" TEXT NOT NULL,
    "teamAName" TEXT NOT NULL,
    "teamACountry" TEXT NOT NULL DEFAULT 'xx',
    "teamALogo" TEXT,
    "teamBName" TEXT NOT NULL,
    "teamBCountry" TEXT NOT NULL DEFAULT 'xx',
    "teamBLogo" TEXT,
    "time" TEXT,
    "date" TEXT,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "scoreA" INTEGER,
    "scoreB" INTEGER,
    "oddsA" DOUBLE PRECISION,
    "oddsB" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EsportsMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsportsNews" (
    "id" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "timeAgo" TEXT,
    "image" TEXT,
    "author" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EsportsNews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamRanking" (
    "id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "teamName" TEXT NOT NULL,
    "teamCountry" TEXT NOT NULL DEFAULT 'xx',
    "points" INTEGER NOT NULL DEFAULT 0,
    "trend" TEXT NOT NULL DEFAULT 'stable',
    "game" TEXT NOT NULL,

    CONSTRAINT "TeamRanking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickemUser" (
    "id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "percentile" TEXT NOT NULL DEFAULT '0%',

    CONSTRAINT "PickemUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerStat" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT,
    "name" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'xx',
    "role" TEXT,
    "photo" TEXT,
    "stats" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "PlayerStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tournament_game_idx" ON "Tournament"("game");

-- CreateIndex
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");

-- CreateIndex
CREATE INDEX "TournamentTeam_tournamentId_idx" ON "TournamentTeam"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentStanding_tournamentId_idx" ON "TournamentStanding"("tournamentId");

-- CreateIndex
CREATE INDEX "BracketMatch_tournamentId_idx" ON "BracketMatch"("tournamentId");

-- CreateIndex
CREATE INDEX "EsportsMatch_game_idx" ON "EsportsMatch"("game");

-- CreateIndex
CREATE INDEX "EsportsMatch_isLive_idx" ON "EsportsMatch"("isLive");

-- CreateIndex
CREATE INDEX "EsportsNews_category_idx" ON "EsportsNews"("category");

-- CreateIndex
CREATE INDEX "TeamRanking_game_idx" ON "TeamRanking"("game");

-- CreateIndex
CREATE INDEX "PlayerStat_tournamentId_idx" ON "PlayerStat"("tournamentId");

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentStanding" ADD CONSTRAINT "TournamentStanding_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketMatch" ADD CONSTRAINT "BracketMatch_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerStat" ADD CONSTRAINT "PlayerStat_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
