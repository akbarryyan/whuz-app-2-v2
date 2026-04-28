-- AlterTable
ALTER TABLE `orders`
    ADD COLUMN `sellerId` VARCHAR(191) NULL,
    ADD COLUMN `sellerProductId` VARCHAR(191) NULL,
    ADD COLUMN `sellerGrossProfit` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `sellerFeeAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `sellerCommission` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `sellerCommissionCreditedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `seller_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(80) NOT NULL,
    `displayName` VARCHAR(120) NOT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `seller_profiles_userId_key`(`userId`),
    UNIQUE INDEX `seller_profiles_slug_key`(`slug`),
    INDEX `seller_profiles_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seller_products` (
    `id` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `sellingPrice` DECIMAL(15, 2) NULL,
    `commissionType` VARCHAR(191) NOT NULL DEFAULT 'PERCENT',
    `commissionValue` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `feeType` VARCHAR(191) NOT NULL DEFAULT 'PERCENT',
    `feeValue` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `seller_products_sellerId_productId_key`(`sellerId`, `productId`),
    INDEX `seller_products_sellerId_isActive_idx`(`sellerId`, `isActive`),
    INDEX `seller_products_productId_isActive_idx`(`productId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seller_withdrawal_requests` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `accountName` VARCHAR(120) NOT NULL,
    `accountNumber` VARCHAR(80) NOT NULL,
    `bankName` VARCHAR(120) NOT NULL,
    `note` TEXT NULL,
    `processedNote` TEXT NULL,
    `processedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `seller_withdrawal_requests_userId_status_createdAt_idx`(`userId`, `status`, `createdAt`),
    INDEX `seller_withdrawal_requests_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `orders_sellerId_status_idx` ON `orders`(`sellerId`, `status`);
CREATE INDEX `orders_sellerProductId_idx` ON `orders`(`sellerProductId`);

-- AddForeignKey
ALTER TABLE `orders`
    ADD CONSTRAINT `orders_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `orders_sellerProductId_fkey` FOREIGN KEY (`sellerProductId`) REFERENCES `seller_products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `seller_profiles`
    ADD CONSTRAINT `seller_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `seller_products`
    ADD CONSTRAINT `seller_products_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `seller_products_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `seller_withdrawal_requests`
    ADD CONSTRAINT `seller_withdrawal_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
