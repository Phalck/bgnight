-- CreateTable
CREATE TABLE "PlannedGameNight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "plannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventDateTime" DATETIME,
    "location" TEXT,
    "customMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlannedGameNight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlannedGame" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plannedNightId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "youtubeVideoId" TEXT,
    "youtubeVideoTitle" TEXT,
    "youtubeVideoUrl" TEXT,
    "order" INTEGER NOT NULL,
    CONSTRAINT "PlannedGame_plannedNightId_fkey" FOREIGN KEY ("plannedNightId") REFERENCES "PlannedGameNight" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlannedGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_PlannedGameNightPlayers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_PlannedGameNightPlayers_A_fkey" FOREIGN KEY ("A") REFERENCES "PlannedGameNight" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_PlannedGameNightPlayers_B_fkey" FOREIGN KEY ("B") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PlannedGameNight_userId_idx" ON "PlannedGameNight"("userId");

-- CreateIndex
CREATE INDEX "PlannedGameNight_plannedAt_idx" ON "PlannedGameNight"("plannedAt");

-- CreateIndex
CREATE INDEX "PlannedGame_plannedNightId_idx" ON "PlannedGame"("plannedNightId");

-- CreateIndex
CREATE INDEX "PlannedGame_gameId_idx" ON "PlannedGame"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "_PlannedGameNightPlayers_AB_unique" ON "_PlannedGameNightPlayers"("A", "B");

-- CreateIndex
CREATE INDEX "_PlannedGameNightPlayers_B_index" ON "_PlannedGameNightPlayers"("B");
