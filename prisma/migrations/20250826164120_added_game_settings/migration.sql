/*
  Warnings:

  - You are about to drop the column `value` on the `Vote` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ScrumPointUnit" AS ENUM ('MINUTE', 'HOUR', 'DAY', 'MONTH');

-- AlterTable
ALTER TABLE "Vote" DROP COLUMN "value",
ADD COLUMN     "scrumPointId" TEXT;

-- CreateTable
CREATE TABLE "GameSettings" (
    "id" TEXT NOT NULL,
    "autoShowResults" BOOLEAN NOT NULL DEFAULT false,
    "autoShowResultsTime" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "onlyScrumMasterCanShowResults" BOOLEAN NOT NULL DEFAULT false,
    "lockVotes" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnVote" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnJoin" BOOLEAN NOT NULL DEFAULT true,
    "persistentLeave" BOOLEAN NOT NULL DEFAULT false,
    "activePresetId" TEXT,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "GameSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrumPoint" (
    "id" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "timeStart" INTEGER NOT NULL,
    "timeEnd" INTEGER NOT NULL,
    "valueUnit" "ScrumPointUnit" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "gameSettingsId" TEXT NOT NULL,

    CONSTRAINT "ScrumPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrumPointPreset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrumPointPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrumPointPresetItem" (
    "id" TEXT NOT NULL,
    "presetId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "timeStart" INTEGER NOT NULL,
    "timeEnd" INTEGER NOT NULL,
    "valueUnit" "ScrumPointUnit" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ScrumPointPresetItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameSettings_organizationId_key" ON "GameSettings"("organizationId");

-- CreateIndex
CREATE INDEX "ScrumPoint_gameSettingsId_idx" ON "ScrumPoint"("gameSettingsId");

-- CreateIndex
CREATE INDEX "ScrumPoint_position_idx" ON "ScrumPoint"("position");

-- CreateIndex
CREATE UNIQUE INDEX "ScrumPoint_gameSettingsId_value_key" ON "ScrumPoint"("gameSettingsId", "value");

-- CreateIndex
CREATE INDEX "ScrumPointPreset_organizationId_idx" ON "ScrumPointPreset"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ScrumPointPreset_organizationId_name_key" ON "ScrumPointPreset"("organizationId", "name");

-- CreateIndex
CREATE INDEX "ScrumPointPresetItem_presetId_idx" ON "ScrumPointPresetItem"("presetId");

-- CreateIndex
CREATE INDEX "ScrumPointPresetItem_position_idx" ON "ScrumPointPresetItem"("position");

-- CreateIndex
CREATE UNIQUE INDEX "ScrumPointPresetItem_presetId_value_key" ON "ScrumPointPresetItem"("presetId", "value");

-- CreateIndex
CREATE INDEX "Vote_scrumPointId_idx" ON "Vote"("scrumPointId");

-- AddForeignKey
ALTER TABLE "GameSettings" ADD CONSTRAINT "GameSettings_activePresetId_fkey" FOREIGN KEY ("activePresetId") REFERENCES "ScrumPointPreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSettings" ADD CONSTRAINT "GameSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrumPoint" ADD CONSTRAINT "ScrumPoint_gameSettingsId_fkey" FOREIGN KEY ("gameSettingsId") REFERENCES "GameSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrumPointPreset" ADD CONSTRAINT "ScrumPointPreset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrumPointPreset" ADD CONSTRAINT "ScrumPointPreset_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrumPointPresetItem" ADD CONSTRAINT "ScrumPointPresetItem_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "ScrumPointPreset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_scrumPointId_fkey" FOREIGN KEY ("scrumPointId") REFERENCES "ScrumPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
