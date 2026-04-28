import { ProviderType, ProviderStatus } from "../domain/enums/provider.enum";

export interface ProviderBalance {
  provider: ProviderType;
  balance: number;
  currency: string;
  lastUpdated: Date;
}

export interface ProviderProduct {
  providerCode: string;
  providerName: string;
  category: string;
  brand: string;
  type: string;
  price: number;
  stock: boolean;
  description?: string;
}

export interface ProviderPurchaseRequest {
  productCode: string;
  target: string; // phone number, game ID, etc.
  additionalData?: Record<string, any>;
}

export interface ProviderPurchaseResponse {
  success: boolean;
  /** Explicit status: "success" | "pending" | "failed" — more reliable than parsing message */
  status: "success" | "pending" | "failed";
  transactionId: string;
  serialNumber?: string;
  message: string;
  rawResponse: any;
}

export interface ProviderHealthCheck {
  provider: ProviderType;
  status: ProviderStatus;
  latency: number; // in ms
  lastCheck: Date;
  message?: string;
}

export interface IProviderPort {
  /**
   * Get provider type
   */
  getProviderType(): ProviderType;

  /**
   * Check provider balance
   */
  checkBalance(): Promise<ProviderBalance>;

  /**
   * Get product list from provider
   */
  getProducts(): Promise<ProviderProduct[]>;

  /**
   * Purchase product from provider
   */
  purchase(request: ProviderPurchaseRequest): Promise<ProviderPurchaseResponse>;

  /**
   * Check the status of a pending transaction by provider's transaction ID / ref.
   * Called by reconcile service for orders stuck in PROCESSING_PROVIDER.
   */
  checkStatus(providerRef: string): Promise<ProviderPurchaseResponse>;

  /**
   * Health check
   */
  healthCheck(): Promise<ProviderHealthCheck>;
}
