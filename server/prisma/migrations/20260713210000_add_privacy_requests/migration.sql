CREATE TYPE "PrivacyRequestType" AS ENUM ('EXPORT', 'DELETE', 'CORRECTION', 'ANONYMIZATION');
CREATE TYPE "PrivacyRequestStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'IN_REVIEW', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELED');

ALTER TABLE "User"
  ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "anonymizedAt" TIMESTAMP(3);

CREATE TABLE "PrivacyRequest" (
  "id" TEXT NOT NULL,
  "protocol" TEXT NOT NULL,
  "type" "PrivacyRequestType" NOT NULL,
  "status" "PrivacyRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "userId" TEXT,
  "requesterEmail" TEXT NOT NULL,
  "confirmationToken" TEXT,
  "confirmationExpiresAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3) NOT NULL,
  "assignedToId" TEXT,
  "resolutionNote" TEXT,
  "completedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrivacyRequestEvent" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "actorId" TEXT,
  "eventType" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrivacyRequestEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PrivacyRequest_protocol_key" ON "PrivacyRequest"("protocol");
CREATE UNIQUE INDEX "PrivacyRequest_confirmationToken_key" ON "PrivacyRequest"("confirmationToken");
CREATE INDEX "PrivacyRequest_userId_createdAt_idx" ON "PrivacyRequest"("userId", "createdAt");
CREATE INDEX "PrivacyRequest_status_dueAt_idx" ON "PrivacyRequest"("status", "dueAt");
CREATE INDEX "PrivacyRequest_type_createdAt_idx" ON "PrivacyRequest"("type", "createdAt");
CREATE INDEX "PrivacyRequest_assignedToId_status_idx" ON "PrivacyRequest"("assignedToId", "status");
CREATE INDEX "PrivacyRequestEvent_requestId_createdAt_idx" ON "PrivacyRequestEvent"("requestId", "createdAt");
CREATE INDEX "PrivacyRequestEvent_actorId_createdAt_idx" ON "PrivacyRequestEvent"("actorId", "createdAt");

ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PrivacyRequestEvent" ADD CONSTRAINT "PrivacyRequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PrivacyRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrivacyRequestEvent" ADD CONSTRAINT "PrivacyRequestEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
