/*
  Warnings:

  - You are about to drop the column `organizationId` on the `Invitation` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_organizationId_fkey";

-- DropIndex
DROP INDEX "Invitation_organizationId_idx";

-- AlterTable
ALTER TABLE "Invitation" DROP COLUMN "organizationId";
