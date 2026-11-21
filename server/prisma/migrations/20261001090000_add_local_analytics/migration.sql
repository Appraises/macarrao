ALTER TYPE "AnalyticsProvider" ADD VALUE 'INTERNAL';

CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "clientEventId" VARCHAR(80),
    "eventName" VARCHAR(80) NOT NULL,
    "visitorHash" VARCHAR(64) NOT NULL,
    "sessionHash" VARCHAR(64) NOT NULL,
    "path" VARCHAR(160),
    "referrer" VARCHAR(250),
    "channel" VARCHAR(40),
    "source" VARCHAR(120),
    "campaign" VARCHAR(120),
    "device" VARCHAR(30),
    "browser" VARCHAR(40),
    "operatingSystem" VARCHAR(40),
    "value" VARCHAR(200),
    "position" INTEGER,
    "resultCount" INTEGER,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalyticsVisitor" (
    "visitorHash" VARCHAR(64) NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsVisitor_pkey" PRIMARY KEY ("visitorHash")
);

CREATE UNIQUE INDEX "AnalyticsEvent_clientEventId_key" ON "AnalyticsEvent"("clientEventId");
CREATE INDEX "AnalyticsEvent_occurredAt_idx" ON "AnalyticsEvent"("occurredAt");
CREATE INDEX "AnalyticsEvent_eventName_occurredAt_idx" ON "AnalyticsEvent"("eventName", "occurredAt");
CREATE INDEX "AnalyticsEvent_visitorHash_occurredAt_idx" ON "AnalyticsEvent"("visitorHash", "occurredAt");
CREATE INDEX "AnalyticsEvent_sessionHash_occurredAt_idx" ON "AnalyticsEvent"("sessionHash", "occurredAt");
CREATE INDEX "AnalyticsEvent_path_occurredAt_idx" ON "AnalyticsEvent"("path", "occurredAt");
CREATE INDEX "AnalyticsVisitor_lastSeenAt_idx" ON "AnalyticsVisitor"("lastSeenAt");
