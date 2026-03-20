-- Add new fields to BulkUpdateSession for error tracking and rate limiting
ALTER TABLE "BulkUpdateSession" ADD COLUMN "consecutiveFailures" INTEGER DEFAULT 0;
ALTER TABLE "BulkUpdateSession" ADD COLUMN "pauseReason" TEXT;
ALTER TABLE "BulkUpdateSession" ADD COLUMN "rateLimitExpiry" TIMESTAMP;
