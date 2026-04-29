export interface PaymentMethodDefinition {
  key: string;
  label: string;
  group: string;
  imageUrl: string | null;
  sortOrder: number;
}

export const PAYMENT_METHOD_DEFINITIONS: PaymentMethodDefinition[] = [
  { key: "midtrans_qris", label: "QRIS Midtrans", group: "QRIS", imageUrl: null, sortOrder: 1 },
  { key: "midtrans_bca_va", label: "BCA Virtual Account", group: "VIRTUAL_ACCOUNT", imageUrl: null, sortOrder: 10 },
  { key: "midtrans_bni_va", label: "BNI Virtual Account", group: "VIRTUAL_ACCOUNT", imageUrl: null, sortOrder: 11 },
  { key: "midtrans_bri_va", label: "BRI Virtual Account", group: "VIRTUAL_ACCOUNT", imageUrl: null, sortOrder: 12 },
  { key: "pakasir_all", label: "Pakasir", group: "QRIS", imageUrl: null, sortOrder: 20 },
];

export const STOREFRONT_SUPPORTED_PAYMENT_METHOD_KEYS = new Set(
  PAYMENT_METHOD_DEFINITIONS.map((method) => method.key)
);

export function getDefaultPaymentMethodSeeds() {
  return PAYMENT_METHOD_DEFINITIONS.map((method) => ({
    ...method,
    isActive: true,
  }));
}

export function isStorefrontSupportedPaymentMethodKey(methodKey: string): boolean {
  return STOREFRONT_SUPPORTED_PAYMENT_METHOD_KEYS.has(methodKey);
}
