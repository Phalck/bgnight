-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "playedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "location" TEXT,
    "rating" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayLog_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_PlayLogPlayers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_PlayLogPlayers_A_fkey" FOREIGN KEY ("A") REFERENCES "PlayLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_PlayLogPlayers_B_fkey" FOREIGN KEY ("B") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_PlayLogWinners" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_PlayLogWinners_A_fkey" FOREIGN KEY ("A") REFERENCES "PlayLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_PlayLogWinners_B_fkey" FOREIGN KEY ("B") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Player_userId_idx" ON "Player"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_name_userId_key" ON "Player"("name", "userId");

-- CreateIndex
CREATE INDEX "PlayLog_gameId_idx" ON "PlayLog"("gameId");

-- CreateIndex
CREATE INDEX "PlayLog_userId_idx" ON "PlayLog"("userId");

-- CreateIndex
CREATE INDEX "PlayLog_playedAt_idx" ON "PlayLog"("playedAt");

-- CreateIndex
CREATE UNIQUE INDEX "_PlayLogPlayers_AB_unique" ON "_PlayLogPlayers"("A", "B");

-- CreateIndex
CREATE INDEX "_PlayLogPlayers_B_index" ON "_PlayLogPlayers"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_PlayLogWinners_AB_unique" ON "_PlayLogWinners"("A", "B");

-- CreateIndex
CREATE INDEX "_PlayLogWinners_B_index" ON "_PlayLogWinners"("B");
