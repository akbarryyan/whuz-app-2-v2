export class ProviderError extends Error {
  constructor(message: string, public provider: string) {
    super(message);
    this.name = "ProviderError";
  }
}

export class ProviderDownError extends ProviderError {
  constructor(provider: string) {
    super(`Provider ${provider} is down`, provider);
    this.name = "ProviderDownError";
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(provider: string) {
    super(`Provider ${provider} timeout`, provider);
    this.name = "ProviderTimeoutError";
  }
}

export class InsufficientProviderBalanceError extends ProviderError {
  constructor(provider: string) {
    super(`Provider ${provider} has insufficient balance`, provider);
    this.name = "InsufficientProviderBalanceError";
  }
}
