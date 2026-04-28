ALTER TABLE seller_withdrawal_requests
  ADD COLUMN bankCode VARCHAR(40) NULL,
  ADD COLUMN payoutGateway VARCHAR(40) NULL,
  ADD COLUMN payoutRefId VARCHAR(120) NULL,
  ADD COLUMN payoutAggRefId VARCHAR(120) NULL,
  ADD COLUMN payoutRawPayload JSON NULL;
