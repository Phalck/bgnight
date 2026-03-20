-- Create table for tracking manual edits
CREATE TABLE "ManualEditTracking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "editedFields" TEXT NOT NULL,
    "editedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index on gameId
CREATE UNIQUE INDEX "ManualEditTracking_gameId_key" ON "ManualEditTracking"("gameId");

-- Create indexes for user lookups
CREATE INDEX "ManualEditTracking_userId_idx" ON "ManualEditTracking"("userId");
CREATE INDEX "ManualEditTracking_gameId_idx" ON "ManualEditTracking"("gameId");

-- Create table for bulk update sessions
CREATE TABLE "BulkUpdateSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalGames" INTEGER NOT NULL,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "autoMatched" INTEGER NOT NULL DEFAULT 0,
    "manualApproved" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "overwriteManual" BOOLEAN NOT NULL,
    "retryStrategy" TEXT NOT NULL DEFAULT 'skip',
    "currentGameId" TEXT,
    "beforeData" TEXT,
    "afterData" TEXT,
    "manualEditGames" TEXT,
    "skippedGames" TEXT,
    "failedGames" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index on userId (only one session per user)
CREATE UNIQUE INDEX "BulkUpdateSession_userId_key" ON "BulkUpdateSession"("userId");

-- Create indexes for querying
CREATE INDEX "BulkUpdateSession_userId_status_idx" ON "BulkUpdateSession"("userId", "status");
CREATE INDEX "BulkUpdateSession_status_idx" ON "BulkUpdateSession"("status");
