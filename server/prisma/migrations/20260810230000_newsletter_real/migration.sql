-- Newsletter confirmation, daily campaigns, per-recipient delivery history and
-- idempotent webhook processing. Existing subscribers remain consented but must
-- confirm their address before receiving the first campaign.
CREATE TYPE "NewsletterSubscriberStatus" AS ENUM ('PENDING', 'ACTIVE', 'UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED', 'SUPPRESSED');
CREATE TYPE "NewsletterCampaignStatus" AS ENUM ('RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'SKIPPED');
CREATE TYPE "NewsletterDeliveryStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'DELAYED', 'FAILED', 'BOUNCED', 'COMPLAINED', 'SUPPRESSED');
CREATE TYPE "NewsletterBatchStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'UNKNOWN');

ALTER TABLE "NewsletterSubscriber"
  ADD COLUMN "status" "NewsletterSubscriberStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "confirmationTokenHash" TEXT,
  ADD COLUMN "confirmationExpiresAt" TIMESTAMP(3),
  ADD COLUMN "confirmationSentAt" TIMESTAMP(3),
  ADD COLUMN "confirmedAt" TIMESTAMP(3),
  ADD COLUMN "blockedAt" TIMESTAMP(3),
  ADD COLUMN "blockedReason" TEXT,
  ADD COLUMN "lastSentAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "NewsletterCampaign" (
  "id" TEXT NOT NULL,
  "dateKey" TEXT NOT NULL,
  "termId" TEXT,
  "termWord" TEXT NOT NULL,
  "termDefinition" TEXT NOT NULL,
  "termExample" TEXT,
  "termGame" TEXT,
  "termTags" JSONB NOT NULL DEFAULT '[]',
  "subject" TEXT NOT NULL,
  "status" "NewsletterCampaignStatus" NOT NULL DEFAULT 'RUNNING',
  "skipReason" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NewsletterCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NewsletterDispatchBatch" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "deliveryIds" JSONB NOT NULL DEFAULT '[]',
  "status" "NewsletterBatchStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NewsletterDispatchBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NewsletterDelivery" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "subscriberId" TEXT,
  "batchId" TEXT,
  "status" "NewsletterDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
  "resendEmailId" TEXT,
  "clickTokenHash" TEXT NOT NULL,
  "unsubscribeTokenHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "delayedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "bouncedAt" TIMESTAMP(3),
  "complainedAt" TIMESTAMP(3),
  "suppressedAt" TIMESTAMP(3),
  "firstClickedAt" TIMESTAMP(3),
  "lastClickedAt" TIMESTAMP(3),
  "clickCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NewsletterDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NewsletterWebhookEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "resendEmailId" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NewsletterWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NewsletterSubscriber_confirmationTokenHash_key" ON "NewsletterSubscriber"("confirmationTokenHash");
CREATE INDEX "NewsletterSubscriber_status_createdAt_idx" ON "NewsletterSubscriber"("status", "createdAt");
CREATE INDEX "NewsletterSubscriber_source_createdAt_idx" ON "NewsletterSubscriber"("source", "createdAt");
DROP INDEX IF EXISTS "NewsletterSubscriber_createdAt_idx";

CREATE UNIQUE INDEX "NewsletterCampaign_dateKey_key" ON "NewsletterCampaign"("dateKey");
CREATE INDEX "NewsletterCampaign_status_startedAt_idx" ON "NewsletterCampaign"("status", "startedAt");
CREATE INDEX "NewsletterCampaign_termId_idx" ON "NewsletterCampaign"("termId");

CREATE UNIQUE INDEX "NewsletterDispatchBatch_idempotencyKey_key" ON "NewsletterDispatchBatch"("idempotencyKey");
CREATE UNIQUE INDEX "NewsletterDispatchBatch_campaignId_sequence_key" ON "NewsletterDispatchBatch"("campaignId", "sequence");
CREATE INDEX "NewsletterDispatchBatch_status_createdAt_idx" ON "NewsletterDispatchBatch"("status", "createdAt");

CREATE UNIQUE INDEX "NewsletterDelivery_resendEmailId_key" ON "NewsletterDelivery"("resendEmailId");
CREATE UNIQUE INDEX "NewsletterDelivery_clickTokenHash_key" ON "NewsletterDelivery"("clickTokenHash");
CREATE UNIQUE INDEX "NewsletterDelivery_unsubscribeTokenHash_key" ON "NewsletterDelivery"("unsubscribeTokenHash");
CREATE UNIQUE INDEX "NewsletterDelivery_campaignId_subscriberId_key" ON "NewsletterDelivery"("campaignId", "subscriberId");
CREATE INDEX "NewsletterDelivery_campaignId_status_idx" ON "NewsletterDelivery"("campaignId", "status");
CREATE INDEX "NewsletterDelivery_subscriberId_createdAt_idx" ON "NewsletterDelivery"("subscriberId", "createdAt");
CREATE INDEX "NewsletterDelivery_batchId_idx" ON "NewsletterDelivery"("batchId");

CREATE INDEX "NewsletterWebhookEvent_resendEmailId_idx" ON "NewsletterWebhookEvent"("resendEmailId");
CREATE INDEX "NewsletterWebhookEvent_processedAt_idx" ON "NewsletterWebhookEvent"("processedAt");

ALTER TABLE "NewsletterCampaign" ADD CONSTRAINT "NewsletterCampaign_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NewsletterDispatchBatch" ADD CONSTRAINT "NewsletterDispatchBatch_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "NewsletterCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsletterDelivery" ADD CONSTRAINT "NewsletterDelivery_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "NewsletterCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsletterDelivery" ADD CONSTRAINT "NewsletterDelivery_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "NewsletterSubscriber"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NewsletterDelivery" ADD CONSTRAINT "NewsletterDelivery_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "NewsletterDispatchBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
