export interface CreatePaymentInput {
  /** Unique order identifier (used as gateway's order_id) */
  orderId: string;
  /** Amount in IDR (integer) */
  amount: number;
  /** Payment method (QRIS, VA_BCA, etc.) — gateway-specific string */
  method?: string;
  /** Redirect URL after payment */
  redirectUrl?: string;
  /** Customer description / item name */
  description?: string;
  /** Optional payer/customer name for gateways that require it */
  payerName?: string;
  /** Optional payer/customer email for gateways that require it */
  payerEmail?: string;
}

export interface CreatePaymentResult {
  /** Gateway-issued invoice/bill ID */
  invoiceId: string;
  /** URL to redirect customer for payment */
  paymentUrl: string;
  /** Payment number (VA / QRIS code) */
  paymentNumber?: string;
  /** Method used */
  method?: string;
  /** Amount before fee */
  amount: number;
  /** Gateway fee */
  fee: number;
  /** Total to pay (amount + fee) */
  totalPayment: number;
  /** Expiry */
  expiredAt?: Date;
  /** Raw response from gateway */
  raw: unknown;
}

export interface DetailPaymentResult {
  invoiceId: string;
  orderId: string;
  status: "pending" | "completed" | "expired" | "failed";
  amount: number;
  fee: number;
  totalPayment: number;
  paidAt?: Date;
  method?: string;
  raw: unknown;
}

export interface IPaymentGatewayPort {
  gatewayName: string;
  /**
   * Create a new payment invoice
   */
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;

  /**
   * Verify payment status from gateway (cross-check after webhook)
   */
  detailPayment(orderId: string, amount: number): Promise<DetailPaymentResult>;

  /**
   * Cancel / expire an invoice
   * orderId = orderCode, amount = nominal pembayaran
   */
  cancelPayment(orderId: string, amount: number): Promise<void>;

  /**
   * Simulate a payment (development only)
   */
  simulatePayment(orderId: string, amount: number, status?: "completed" | "expired"): Promise<void>;
}
