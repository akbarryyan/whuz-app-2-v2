ALTER TABLE `payment_invoices`
    MODIFY `paymentNumber` TEXT NULL;

ALTER TABLE `wallet_topups`
    MODIFY `paymentNumber` TEXT NULL;
