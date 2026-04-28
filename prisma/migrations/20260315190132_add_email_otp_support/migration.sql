-- AlterTable
ALTER TABLE `otp_codes` ADD COLUMN `email` VARCHAR(255) NULL,
    ADD COLUMN `target` VARCHAR(10) NOT NULL DEFAULT 'whatsapp',
    MODIFY `phone` VARCHAR(20) NULL;

-- CreateIndex
CREATE INDEX `otp_codes_email_purpose_createdAt_idx` ON `otp_codes`(`email`, `purpose`, `createdAt`);
