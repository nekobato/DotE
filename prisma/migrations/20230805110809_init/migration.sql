/*
  Warnings:

  - You are about to drop the column `userId` on the `User` table. All the data in the column will be lost.
  - Added the required column `instanceUserId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "instanceUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "token" TEXT NOT NULL,
    "instanceUrl" TEXT NOT NULL,
    "instanceType" TEXT NOT NULL
);
INSERT INTO "new_User" ("avatarUrl", "id", "instanceType", "instanceUrl", "name", "token", "username") SELECT "avatarUrl", "id", "instanceType", "instanceUrl", "name", "token", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
