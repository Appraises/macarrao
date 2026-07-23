CREATE TYPE "AnalyticsProvider" AS ENUM ('PLAUSIBLE', 'SEARCH_CONSOLE', 'SENTRY', 'CRUX', 'PAGESPEED');
CREATE TYPE "AnalyticsSyncStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED', 'SKIPPED');
CREATE TYPE "AnalyticsSyncTrigger" AS ENUM ('SCHEDULED', 'MANUAL', 'STARTUP');
CREATE TYPE "TrafficDimensionKind" AS ENUM ('CHANNEL', 'SOURCE', 'REFERRER', 'ENTRY_PAGE', 'EXIT_PAGE', 'PAGE', 'COUNTRY', 'DEVICE', 'BROWSER', 'OPERATING_SYSTEM', 'CAMPAIGN', 'EVENT');
CREATE TYPE "SearchConsoleDimensionKind" AS ENUM ('QUERY', 'PAGE', 'DEVICE', 'COUNTRY');
CREATE TYPE "SearchOrigin" AS ENUM ('HOME', 'CATALOG', 'GAME', 'NOT_FOUND', 'UNKNOWN');
CREATE TYPE "TermViewSource" AS ENUM ('DIRECT', 'SEARCH_RESULT', 'SEARCH_SUGGESTION', 'RELATED_TERM', 'TRENDING', 'GAME_GLOSSARY', 'UNKNOWN');

ALTER TABLE "Notification" ADD COLUMN "clickedAt" TIMESTAMP(3);

CREATE TABLE "InternalSearchEvent" (
    "id" TEXT NOT NULL,
    "queryHash" TEXT NOT NULL,
    "normalizedQuery" TEXT,
    "origin" "SearchOrigin" NOT NULL DEFAULT 'UNKNOWN',
    "gameId" TEXT,
    "tag" TEXT,
    "letter" TEXT,
    "sort" TEXT,
    "resultCount" INTEGER NOT NULL,
    "openedTermId" TEXT,
    "openedPosition" INTEGER,
    "openedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InternalSearchEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TermView"
    ADD COLUMN "source" "TermViewSource" NOT NULL DEFAULT 'UNKNOWN',
    ADD COLUMN "searchEventId" TEXT;

CREATE TABLE "UserActivityDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loginCount" INTEGER NOT NULL DEFAULT 0,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "UserActivityDay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalyticsSyncRun" (
    "id" TEXT NOT NULL,
    "provider" "AnalyticsProvider" NOT NULL,
    "status" "AnalyticsSyncStatus" NOT NULL DEFAULT 'RUNNING',
    "trigger" "AnalyticsSyncTrigger" NOT NULL DEFAULT 'SCHEDULED',
    "actorId" TEXT,
    "rangeStart" DATE,
    "rangeEnd" DATE,
    "rowsProcessed" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    CONSTRAINT "AnalyticsSyncRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrafficDailyMetric" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "pageviews" INTEGER NOT NULL DEFAULT 0,
    "bounceRate" DOUBLE PRECISION,
    "visitDurationSec" DOUBLE PRECISION,
    "newVisits" INTEGER NOT NULL DEFAULT 0,
    "returningVisits" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrafficDailyMetric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrafficDimensionDaily" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "kind" "TrafficDimensionKind" NOT NULL,
    "value" TEXT NOT NULL,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "pageviews" INTEGER NOT NULL DEFAULT 0,
    "bounceRate" DOUBLE PRECISION,
    "visitDurationSec" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrafficDimensionDaily_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SearchConsoleDailyMetric" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "clicks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SearchConsoleDailyMetric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SearchConsoleDimensionDaily" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "kind" "SearchConsoleDimensionKind" NOT NULL,
    "value" TEXT NOT NULL,
    "clicks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SearchConsoleDimensionDaily_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UrlInspectionSnapshot" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "inspectionDate" DATE NOT NULL,
    "verdict" TEXT NOT NULL,
    "coverageState" TEXT,
    "indexingState" TEXT,
    "robotsTxtState" TEXT,
    "pageFetchState" TEXT,
    "lastCrawlTime" TIMESTAMP(3),
    "issues" JSONB NOT NULL DEFAULT '[]',
    "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UrlInspectionSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TechnicalMetricSnapshot" (
    "id" TEXT NOT NULL,
    "provider" "AnalyticsProvider" NOT NULL,
    "date" DATE NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'site',
    "device" TEXT NOT NULL DEFAULT 'ALL',
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TechnicalMetricSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserActivityDay_userId_date_key" ON "UserActivityDay"("userId", "date");
CREATE INDEX "UserActivityDay_date_idx" ON "UserActivityDay"("date");
CREATE INDEX "UserActivityDay_userId_lastSeenAt_idx" ON "UserActivityDay"("userId", "lastSeenAt");
CREATE INDEX "InternalSearchEvent_createdAt_idx" ON "InternalSearchEvent"("createdAt");
CREATE INDEX "InternalSearchEvent_queryHash_createdAt_idx" ON "InternalSearchEvent"("queryHash", "createdAt");
CREATE INDEX "InternalSearchEvent_origin_createdAt_idx" ON "InternalSearchEvent"("origin", "createdAt");
CREATE INDEX "InternalSearchEvent_openedAt_createdAt_idx" ON "InternalSearchEvent"("openedAt", "createdAt");
CREATE INDEX "InternalSearchEvent_openedTermId_createdAt_idx" ON "InternalSearchEvent"("openedTermId", "createdAt");
CREATE INDEX "TermView_source_createdAt_idx" ON "TermView"("source", "createdAt");
CREATE INDEX "TermView_searchEventId_idx" ON "TermView"("searchEventId");
CREATE INDEX "AnalyticsSyncRun_provider_startedAt_idx" ON "AnalyticsSyncRun"("provider", "startedAt");
CREATE INDEX "AnalyticsSyncRun_status_startedAt_idx" ON "AnalyticsSyncRun"("status", "startedAt");
CREATE INDEX "AnalyticsSyncRun_actorId_startedAt_idx" ON "AnalyticsSyncRun"("actorId", "startedAt");
CREATE UNIQUE INDEX "AnalyticsSyncRun_one_running_provider_key" ON "AnalyticsSyncRun"("provider") WHERE "status" = 'RUNNING';
CREATE UNIQUE INDEX "TrafficDailyMetric_date_key" ON "TrafficDailyMetric"("date");
CREATE INDEX "TrafficDailyMetric_date_idx" ON "TrafficDailyMetric"("date");
CREATE UNIQUE INDEX "TrafficDimensionDaily_date_kind_value_key" ON "TrafficDimensionDaily"("date", "kind", "value");
CREATE INDEX "TrafficDimensionDaily_kind_date_idx" ON "TrafficDimensionDaily"("kind", "date");
CREATE UNIQUE INDEX "SearchConsoleDailyMetric_date_key" ON "SearchConsoleDailyMetric"("date");
CREATE INDEX "SearchConsoleDailyMetric_date_idx" ON "SearchConsoleDailyMetric"("date");
CREATE UNIQUE INDEX "SearchConsoleDimensionDaily_date_kind_value_key" ON "SearchConsoleDimensionDaily"("date", "kind", "value");
CREATE INDEX "SearchConsoleDimensionDaily_kind_date_idx" ON "SearchConsoleDimensionDaily"("kind", "date");
CREATE UNIQUE INDEX "UrlInspectionSnapshot_url_inspectionDate_key" ON "UrlInspectionSnapshot"("url", "inspectionDate");
CREATE INDEX "UrlInspectionSnapshot_verdict_inspectedAt_idx" ON "UrlInspectionSnapshot"("verdict", "inspectedAt");
CREATE INDEX "UrlInspectionSnapshot_inspectedAt_idx" ON "UrlInspectionSnapshot"("inspectedAt");
CREATE UNIQUE INDEX "TechnicalMetricSnapshot_provider_date_kind_key_device_key" ON "TechnicalMetricSnapshot"("provider", "date", "kind", "key", "device");
CREATE INDEX "TechnicalMetricSnapshot_provider_kind_date_idx" ON "TechnicalMetricSnapshot"("provider", "kind", "date");

ALTER TABLE "InternalSearchEvent" ADD CONSTRAINT "InternalSearchEvent_openedTermId_fkey" FOREIGN KEY ("openedTermId") REFERENCES "Term"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TermView" ADD CONSTRAINT "TermView_searchEventId_fkey" FOREIGN KEY ("searchEventId") REFERENCES "InternalSearchEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserActivityDay" ADD CONSTRAINT "UserActivityDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsSyncRun" ADD CONSTRAINT "AnalyticsSyncRun_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
