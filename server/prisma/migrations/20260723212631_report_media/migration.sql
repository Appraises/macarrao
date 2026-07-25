-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "mediaId" TEXT;

-- CreateIndex
CREATE INDEX "Report_mediaId_idx" ON "Report"("mediaId");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "TermMedia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

