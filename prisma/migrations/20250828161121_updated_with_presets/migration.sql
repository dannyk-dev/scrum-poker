-- DropForeignKey
ALTER TABLE "Vote" DROP CONSTRAINT "Vote_scrumPointId_fkey";

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_scrumPointId_fkey" FOREIGN KEY ("scrumPointId") REFERENCES "ScrumPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
