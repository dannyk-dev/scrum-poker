/*
  Warnings:

  - A unique constraint covering the columns `[gameId,userId]` on the table `Vote` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Vote_gameId_userId_key` ON `Vote`(`gameId`, `userId`);
