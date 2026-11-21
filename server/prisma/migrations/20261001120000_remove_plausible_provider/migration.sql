-- Remove the retired Plausible provider from the live analytics model.
-- Historical migrations remain unchanged; old Plausible sync records are
-- intentionally discarded because they no longer describe a supported source.
BEGIN;

DELETE FROM "AnalyticsSyncRun" WHERE "provider" = 'PLAUSIBLE';
DELETE FROM "TechnicalMetricSnapshot" WHERE "provider" = 'PLAUSIBLE';

CREATE TYPE "AnalyticsProvider_new" AS ENUM ('INTERNAL', 'SEARCH_CONSOLE', 'SENTRY', 'CRUX', 'PAGESPEED');

ALTER TABLE "AnalyticsSyncRun"
    ALTER COLUMN "provider" TYPE "AnalyticsProvider_new"
    USING ("provider"::text::"AnalyticsProvider_new");

ALTER TABLE "TechnicalMetricSnapshot"
    ALTER COLUMN "provider" TYPE "AnalyticsProvider_new"
    USING ("provider"::text::"AnalyticsProvider_new");

ALTER TYPE "AnalyticsProvider" RENAME TO "AnalyticsProvider_old";
ALTER TYPE "AnalyticsProvider_new" RENAME TO "AnalyticsProvider";
DROP TYPE "AnalyticsProvider_old";

COMMIT;
