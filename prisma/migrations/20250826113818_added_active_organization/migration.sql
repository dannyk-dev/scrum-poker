/*
  Warnings:

  - A unique constraint covering the columns `[activeOrganizationId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activeOrganizationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_activeOrganizationId_key" ON "User"("activeOrganizationId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activeOrganizationId_fkey" FOREIGN KEY ("activeOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
