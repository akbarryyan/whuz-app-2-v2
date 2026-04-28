-- Seed default config key for home game grid border image.
-- Safe to run repeatedly because it upserts by primary key.
INSERT INTO `site_configs` (`key`, `value`, `updatedAt`)
VALUES ('HOME_GAME_GRID_BORDER_IMAGE_URL', '', CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE
  `updatedAt` = `updatedAt`;
