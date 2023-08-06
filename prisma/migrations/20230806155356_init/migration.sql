/*
  Warnings:

  - You are about to alter the column `userId` on the `Timeline` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Timeline" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Timeline" ("channel", "createdAt", "id", "options", "updatedAt", "userId") SELECT "channel", "createdAt", "id", "options", "updatedAt", "userId" FROM "Timeline";
DROP TABLE "Timeline";
ALTER TABLE "new_Timeline" RENAME TO "Timeline";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
