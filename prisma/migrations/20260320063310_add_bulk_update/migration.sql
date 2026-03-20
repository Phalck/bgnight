-- DropIndex
DROP INDEX "BulkUpdateSession_userId_status_idx";

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allowRegistration" BOOLEAN NOT NULL DEFAULT true,
    "inviteOnlyMode" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InviteCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "usedBy" TEXT,
    "usedAt" DATETIME,
    "expiresAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bggId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnail" TEXT,
    "image" TEXT,
    "minPlayers" INTEGER NOT NULL,
    "maxPlayers" INTEGER NOT NULL,
    "minPlayTime" INTEGER,
    "maxPlayTime" INTEGER,
    "yearPublished" INTEGER,
    "description" TEXT,
    "mechanics" TEXT NOT NULL,
    "categories" TEXT NOT NULL,
    "designers" TEXT NOT NULL,
    "publishers" TEXT NOT NULL,
    "artists" TEXT NOT NULL DEFAULT '',
    "minAge" INTEGER,
    "complexity" REAL,
    "bggRating" REAL,
    "bggRatingsCount" INTEGER,
    "bggRank" INTEGER,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Game_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Game" ("bggId", "categories", "createdAt", "description", "designers", "id", "image", "maxPlayTime", "maxPlayers", "mechanics", "minPlayTime", "minPlayers", "publishers", "thumbnail", "title", "userId", "yearPublished") SELECT "bggId", "categories", "createdAt", "description", "designers", "id", "image", "maxPlayTime", "maxPlayers", "mechanics", "minPlayTime", "minPlayers", "publishers", "thumbnail", "title", "userId", "yearPublished" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
CREATE UNIQUE INDEX "Game_bggId_key" ON "Game"("bggId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "password", "updatedAt") SELECT "createdAt", "email", "id", "name", "password", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "InviteCode_code_key" ON "InviteCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "InviteCode_usedBy_key" ON "InviteCode"("usedBy");

-- CreateIndex
CREATE INDEX "InviteCode_code_idx" ON "InviteCode"("code");

-- CreateIndex
CREATE INDEX "InviteCode_isActive_idx" ON "InviteCode"("isActive");

-- CreateIndex
CREATE INDEX "InviteCode_createdBy_idx" ON "InviteCode"("createdBy");

-- CreateIndex
CREATE INDEX "BulkUpdateSession_userId_idx" ON "BulkUpdateSession"("userId");
