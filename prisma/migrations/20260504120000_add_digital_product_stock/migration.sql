CREATE TABLE `digital_product_stocks` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `label` VARCHAR(120) NULL,
    `credentialEmail` VARCHAR(255) NULL,
    `credentialPassword` VARCHAR(255) NULL,
    `credentialData` JSON NULL,
    `notes` TEXT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    `soldAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `digital_product_stocks_orderId_key`(`orderId`),
    INDEX `digital_product_stocks_productId_status_idx`(`productId`, `status`),
    INDEX `digital_product_stocks_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `order_notifications` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(30) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `status` VARCHAR(30) NOT NULL,
    `target` VARCHAR(255) NULL,
    `message` TEXT NULL,
    `error` TEXT NULL,
    `sentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `order_notifications_orderId_channel_type_key`(`orderId`, `channel`, `type`),
    INDEX `order_notifications_channel_status_idx`(`channel`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `digital_product_stocks` ADD CONSTRAINT `digital_product_stocks_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `digital_product_stocks` ADD CONSTRAINT `digital_product_stocks_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `order_notifications` ADD CONSTRAINT `order_notifications_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
