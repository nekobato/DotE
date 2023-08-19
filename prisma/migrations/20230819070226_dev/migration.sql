-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "token" TEXT NOT NULL,
    "instanceId" INTEGER NOT NULL,
    CONSTRAINT "User_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Instance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "iconUrl" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Timeline" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "options" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Post" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "instanceId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");
