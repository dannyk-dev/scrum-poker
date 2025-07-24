-- DropForeignKey
ALTER TABLE `Game` DROP FOREIGN KEY `Game_roomId_fkey`;

-- DropIndex
DROP INDEX `Game_roomId_key` ON `Game`;

-- AddForeignKey
-- ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
