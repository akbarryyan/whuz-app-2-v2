CREATE TABLE `site_visitors` (
  `id` VARCHAR(191) NOT NULL,
  `visitorId` VARCHAR(191) NOT NULL,
  `firstSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastSeenAt` DATETIME(3) NOT NULL,
  `lastPath` VARCHAR(255) NULL,

  UNIQUE INDEX `site_visitors_visitorId_key`(`visitorId`),
  INDEX `site_visitors_firstSeenAt_idx`(`firstSeenAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `site_daily_metrics` (
  `date` VARCHAR(191) NOT NULL,
  `uniqueVisitors` INTEGER NOT NULL DEFAULT 0,
  `pageViews` INTEGER NOT NULL DEFAULT 0,
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`date`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
