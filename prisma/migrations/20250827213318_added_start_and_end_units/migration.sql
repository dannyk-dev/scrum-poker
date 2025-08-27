/*
  Warnings:

  - You are about to drop the column `valueUnit` on the `ScrumPoint` table. All the data in the column will be lost.
  - You are about to drop the column `valueUnit` on the `ScrumPointPresetItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ScrumPoint" DROP COLUMN "valueUnit",
ADD COLUMN     "valueEndUnit" "ScrumPointUnit" NOT NULL DEFAULT 'DAY',
ADD COLUMN     "valueStartUnit" "ScrumPointUnit" NOT NULL DEFAULT 'DAY';

-- AlterTable
ALTER TABLE "ScrumPointPresetItem" DROP COLUMN "valueUnit",
ADD COLUMN     "valueEndUnit" "ScrumPointUnit" NOT NULL DEFAULT 'DAY',
ADD COLUMN     "valueStartUnit" "ScrumPointUnit" NOT NULL DEFAULT 'DAY';
