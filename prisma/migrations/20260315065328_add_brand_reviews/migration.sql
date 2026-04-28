-- CreateTable
CREATE TABLE `brand_reviews` (
    `id` VARCHAR(191) NOT NULL,
    `brandSlug` VARCHAR(200) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(100) NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` VARCHAR(500) NOT NULL,
    `isApproved` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `brand_reviews_brandSlug_isApproved_createdAt_idx`(`brandSlug`, `isApproved`, `createdAt`),
    UNIQUE INDEX `brand_reviews_brandSlug_userId_key`(`brandSlug`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `brand_reviews` ADD CONSTRAINT `brand_reviews_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
