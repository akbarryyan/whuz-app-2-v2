export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class InsufficientBalanceError extends DomainError {
  constructor() {
    super("Insufficient wallet balance");
    this.name = "InsufficientBalanceError";
  }
}

export class PaymentNotCompletedError extends DomainError {
  constructor() {
    super("Payment has not been completed");
    this.name = "PaymentNotCompletedError";
  }
}

export class InvalidOrderStateError extends DomainError {
  constructor(from: string, to: string) {
    super(`Cannot transition order from ${from} to ${to}`);
    this.name = "InvalidOrderStateError";
  }
}

export class DuplicateWebhookError extends DomainError {
  constructor(eventId: string) {
    super(`Webhook event ${eventId} already processed`);
    this.name = "DuplicateWebhookError";
  }
}

export class GuestWalletError extends DomainError {
  constructor() {
    super("Guest users cannot use wallet");
    this.name = "GuestWalletError";
  }
}

export class InvalidTokenError extends DomainError {
  constructor() {
    super("Invalid or missing order access token");
    this.name = "InvalidTokenError";
  }
}
