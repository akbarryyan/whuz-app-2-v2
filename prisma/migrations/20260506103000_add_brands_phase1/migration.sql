CREATE TABLE `brands` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `imageUrl` TEXT NULL,
    `inputFields` JSON NULL,
    `manualCategoryId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `brands_name_key`(`name`),
    UNIQUE INDEX `brands_slug_key`(`slug`),
    INDEX `brands_manualCategoryId_isActive_idx`(`manualCategoryId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `products`
    ADD COLUMN `brandId` VARCHAR(191) NULL;

ALTER TABLE `brand_reviews`
    ADD COLUMN `brandId` VARCHAR(191) NULL;

CREATE INDEX `products_brandId_idx` ON `products`(`brandId`);
CREATE INDEX `brand_reviews_brandId_idx` ON `brand_reviews`(`brandId`);

ALTER TABLE `brands`
    ADD CONSTRAINT `brands_manualCategoryId_fkey`
    FOREIGN KEY (`manualCategoryId`) REFERENCES `manual_categories`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `products`
    ADD CONSTRAINT `products_brandId_fkey`
    FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `brand_reviews`
    ADD CONSTRAINT `brand_reviews_brandId_fkey`
    FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `brands` (`id`, `name`, `slug`, `imageUrl`, `inputFields`, `manualCategoryId`, `isActive`, `createdAt`, `updatedAt`)
WITH source_brands AS (
    SELECT DISTINCT `brand` AS `name`
    FROM `brand_meta`
    UNION
    SELECT DISTINCT `brand` AS `name`
    FROM `products`
),
brand_seed AS (
    SELECT
        sb.`name`,
        bm.`imageUrl`,
        bm.`inputFields`,
        bm.`manualCategoryId`,
        COALESCE(
            NULLIF(
                LOWER(
                    TRIM(
                        REGEXP_REPLACE(
                            REGEXP_REPLACE(sb.`name`, '[^a-zA-Z0-9]+', '-'),
                            '(^-+|-+$)',
                            ''
                        )
                    )
                ),
                ''
            ),
            'brand'
        ) AS `slugBase`
    FROM source_brands sb
    LEFT JOIN `brand_meta` bm ON bm.`brand` = sb.`name`
),
ranked_brands AS (
    SELECT
        UUID() AS `id`,
        `name`,
        `imageUrl`,
        `inputFields`,
        `manualCategoryId`,
        `slugBase`,
        ROW_NUMBER() OVER (PARTITION BY `slugBase` ORDER BY `name`) AS `slugRank`
    FROM brand_seed
)
SELECT
    `id`,
    `name`,
    CASE
        WHEN `slugRank` = 1 THEN `slugBase`
        ELSE CONCAT(`slugBase`, '-', `slugRank`)
    END AS `slug`,
    `imageUrl`,
    `inputFields`,
    `manualCategoryId`,
    true,
    NOW(3),
    NOW(3)
FROM ranked_brands;

UPDATE `products` p
INNER JOIN `brands` b ON b.`name` = p.`brand`
SET p.`brandId` = b.`id`
WHERE p.`brandId` IS NULL;

UPDATE `brand_reviews` br
INNER JOIN `brands` b ON b.`slug` = br.`brandSlug`
SET br.`brandId` = b.`id`
WHERE br.`brandId` IS NULL;
