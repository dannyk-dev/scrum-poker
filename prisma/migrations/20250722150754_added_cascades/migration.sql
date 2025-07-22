-- DropForeignKey
ALTER TABLE `Game` DROP FOREIGN KEY `Game_roomId_fkey`;

-- DropForeignKey
ALTER TABLE `Invitation` DROP FOREIGN KEY `Invitation_roomId_fkey`;

-- DropForeignKey
ALTER TABLE `RoomUser` DROP FOREIGN KEY `RoomUser_roomId_fkey`;

-- DropIndex
DROP INDEX `Invitation_roomId_fkey` ON `Invitation`;

-- AddForeignKey
ALTER TABLE `RoomUser` ADD CONSTRAINT `RoomUser_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invitation` ADD CONSTRAINT `Invitation_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Game` ADD CONSTRAINT `Game_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
