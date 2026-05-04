CREATE TABLE `manual_categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `description` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `manual_categories_name_key`(`name`),
    UNIQUE INDEX `manual_categories_slug_key`(`slug`),
    INDEX `manual_categories_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `brand_meta` ADD COLUMN `manualCategoryId` VARCHAR(191) NULL;
CREATE INDEX `brand_meta_manualCategoryId_idx` ON `brand_meta`(`manualCategoryId`);
ALTER TABLE `brand_meta` ADD CONSTRAINT `brand_meta_manualCategoryId_fkey` FOREIGN KEY (`manualCategoryId`) REFERENCES `manual_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
