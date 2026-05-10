import { createHash } from "crypto";
import {
  IProviderPort,
  ProviderBalance,
  ProviderHealthCheck,
  ProviderProduct,
  ProviderPurchaseRequest,
  ProviderPurchaseResponse,
} from "@/src/core/ports/provider.port";
import { ProviderType, ProviderStatus } from "@/src/core/domain/enums/provider.enum";
import { ProviderError } from "@/src/core/domain/errors/provider.errors";
import { getSiteConfigValue } from "@/lib/site-config";

type Agenh2hRecord = Record<string, unknown>;

interface Agenh2hWebhookData {
  ref_id?: string;
  status?: string;
  produk?: string;
  sku?: string;
  price?: number | string;
  last_saldo?: number | string;
  tujuan?: string;
  message?: string;
  sign?: string;
  [key: string]: unknown;
}

interface Agenh2hWebhookPayload {
  data?: Agenh2hWebhookData;
  [key: string]: unknown;
}

export class Agenh2hAdapter implements IProviderPort {
  private apiKey = "";
  private baseUrl = "https://api.agenh2h.com/v1";

  private async ensureConfig(): Promise<void> {
    const [apiKey, baseUrl] = await Promise.all([
      getSiteConfigValue("AGENH2H_API_KEY"),
      getSiteConfigValue("AGENH2H_BASE_URL", "https://api.agenh2h.com/v1"),
    ]);

    this.apiKey = apiKey.trim();
    this.baseUrl = (baseUrl || "https://api.agenh2h.com/v1").replace(/\/+$/, "");

    if (!this.apiKey) {
      throw new ProviderError("AGENH2H_API_KEY belum dikonfigurasi", "AGENH2H");
    }
  }

  getProviderType(): ProviderType {
    return ProviderType.AGENH2H;
  }

  async checkBalance(): Promise<ProviderBalance> {
    try {
      await this.ensureConfig();
      // Docs yang diberikan belum menyediakan endpoint saldo.
      // Kita ping endpoint produk untuk validasi auth/konektivitas dan kembalikan balance 0.
      await this.getProducts();

      return {
        provider: ProviderType.AGENH2H,
        balance: 0,
        currency: "IDR",
        lastUpdated: new Date(),
      };
    } catch (error) {
      throw new ProviderError(
        `Failed to check AgenH2H balance: ${error instanceof Error ? error.message : "Unknown error"}`,
        "AGENH2H"
      );
    }
  }

  async getProducts(): Promise<ProviderProduct[]> {
    try {
      await this.ensureConfig();
      console.log("[AGENH2H] Requesting product list", {
        url: `${this.baseUrl}/produk`,
        hasApiKey: Boolean(this.apiKey),
      });

      const response = await fetch(`${this.baseUrl}/produk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: this.apiKey,
        }),
      });

      if (!response.ok) {
        throw new ProviderError(`AgenH2H API error: ${response.statusText}`, "AGENH2H");
      }

      const json = (await response.json()) as Agenh2hRecord;
      console.log("[AGENH2H] Raw product response:", JSON.stringify(json));
      const items = pickArray(json);
      console.log("[AGENH2H] Parsed product containers", {
        itemCount: items.length,
        topLevelKeys: Object.keys(json),
        dataType: Array.isArray(json.data) ? "array" : typeof json.data,
      });
      if (!items.length) {
        console.warn("[AGENH2H] Product sync returned zero parsable items. Response shape may not match current parser.");
        return [];
      }

      const normalized = items
        .map(normalizeProductRecord)
        .filter((item): item is ProviderProduct => Boolean(item));

      console.log("[AGENH2H] Normalized products summary", {
        rawItems: items.length,
        normalizedItems: normalized.length,
        sample: normalized.slice(0, 3).map((item) => ({
          code: item.providerCode,
          name: item.providerName,
          category: item.category,
          brand: item.brand,
          price: item.price,
        })),
      });

      return normalized;
    } catch (error) {
      throw new ProviderError(
        `Failed to get AgenH2H products: ${error instanceof Error ? error.message : "Unknown error"}`,
        "AGENH2H"
      );
    }
  }

  async purchase(request: ProviderPurchaseRequest): Promise<ProviderPurchaseResponse> {
    try {
      await this.ensureConfig();
      const refId = `AGH-${Date.now()}`;
      const callbackUrl = await this.getCallbackUrl();

      const payload: Record<string, unknown> = {
        api_key: this.apiKey,
        tujuan: request.target,
        produk: request.productCode,
        ref_id: refId,
        sign: this.generateSignature(refId),
      };

      if (callbackUrl) {
        payload.cb_url = callbackUrl;
      }

      const response = await fetch(`${this.baseUrl}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new ProviderError(`AgenH2H API error: ${response.statusText}`, "AGENH2H");
      }

      const json = (await response.json()) as Agenh2hRecord;
      return normalizeOrderResponse(json, refId);
    } catch (error) {
      throw new ProviderError(
        `Failed to purchase from AgenH2H: ${error instanceof Error ? error.message : "Unknown error"}`,
        "AGENH2H"
      );
    }
  }

  async checkStatus(providerRef: string): Promise<ProviderPurchaseResponse> {
    try {
      await this.ensureConfig();
      const response = await fetch(`${this.baseUrl}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          ref_id: providerRef,
          sign: this.generateSignature(providerRef),
        }),
      });

      if (!response.ok) {
        throw new ProviderError(`AgenH2H status error: ${response.statusText}`, "AGENH2H");
      }

      const json = (await response.json()) as Agenh2hRecord;
      return normalizeOrderResponse(json, providerRef);
    } catch (error) {
      throw new ProviderError(
        `Failed to checkStatus from AgenH2H: ${error instanceof Error ? error.message : "Unknown error"}`,
        "AGENH2H"
      );
    }
  }

  async healthCheck(): Promise<ProviderHealthCheck> {
    const startTime = Date.now();

    try {
      await this.getProducts();
      return {
        provider: ProviderType.AGENH2H,
        status: ProviderStatus.ONLINE,
        latency: Date.now() - startTime,
        lastCheck: new Date(),
        message: "Provider is healthy",
      };
    } catch (error) {
      return {
        provider: ProviderType.AGENH2H,
        status: ProviderStatus.OFFLINE,
        latency: Date.now() - startTime,
        lastCheck: new Date(),
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async verifyWebhook(payload: Agenh2hWebhookPayload): Promise<boolean> {
    await this.ensureConfig();
    const refId = String(payload.data?.ref_id ?? "").trim();
    const signature = String(payload.data?.sign ?? "").trim().toLowerCase();
    if (!refId || !signature) return false;
    return signature === this.generateSignature(refId);
  }

  private generateSignature(refId: string): string {
    const md5 = createHash("md5");
    md5.update(this.apiKey + refId);
    return md5.digest("hex");
  }

  private async getCallbackUrl(): Promise<string | undefined> {
    const base = (
      await getSiteConfigValue(
        "APP_URL",
        process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? ""
      )
    ).trim();

    if (!base) return undefined;
    return `${base.replace(/\/+$/, "")}/api/webhook/agenh2h`;
  }
}

function pickArray(payload: Agenh2hRecord): Agenh2hRecord[] {
  if (Array.isArray(payload.data)) {
    return payload.data.filter(isRecord);
  }

  if (isRecord(payload.data) && Array.isArray(payload.data.items)) {
    return payload.data.items.filter(isRecord);
  }

  if (Array.isArray(payload.result)) {
    return payload.result.filter(isRecord);
  }

  if (Array.isArray(payload.products)) {
    return payload.products.filter(isRecord);
  }

  return [];
}

function normalizeProductRecord(item: Agenh2hRecord): ProviderProduct | null {
  const providerCode = pickString(item, ["sku", "code", "kode", "produk_code", "product_code"]);
  if (!providerCode) return null;

  const providerName =
    pickString(item, ["produk", "product_name", "name", "nama"]) || providerCode;
  const category =
    pickString(item, ["category", "kategori", "type"]) || "Other";
  const brand =
    pickString(item, ["brand", "game", "operator", "provider"]) || category || "Other";
  const type =
    pickString(item, ["type", "jenis"]) || "prepaid";
  const price = pickNumber(item, ["price", "harga", "selling_price", "buyer_price"]);
  const stockValue = item.stock ?? item.is_active ?? item.status ?? item.available;

  return {
    providerCode,
    providerName,
    category,
    brand,
    type,
    price,
    stock: normalizeStock(stockValue),
    description: pickString(item, ["description", "desc", "keterangan"]) ?? undefined,
  };
}

function normalizeOrderResponse(payload: Agenh2hRecord, fallbackRefId: string): ProviderPurchaseResponse {
  const data = isRecord(payload.data) ? payload.data : payload;
  const status = normalizeOrderStatus(
    pickString(data, ["status"]) ?? pickString(payload, ["status"]),
    pickString(data, ["message"]) ?? pickString(payload, ["message"])
  );
  const transactionId =
    pickString(data, ["ref_id", "trx_id", "transaction_id"]) ||
    pickString(payload, ["ref_id", "trx_id", "transaction_id"]) ||
    fallbackRefId;
  const serialNumber =
    pickString(data, ["sn", "serial_number", "note"]) ||
    pickString(payload, ["sn", "serial_number", "note"]);
  const message =
    pickString(data, ["message", "msg"]) ||
    pickString(payload, ["message", "msg"]) ||
    "Transaction processed";

  return {
    success: status === "success",
    status,
    transactionId,
    serialNumber: serialNumber || undefined,
    message,
    rawResponse: payload,
  };
}

function normalizeOrderStatus(statusValue?: string | null, messageValue?: string | null): "success" | "pending" | "failed" {
  const status = String(statusValue ?? "").trim().toLowerCase();
  const message = String(messageValue ?? "").trim().toLowerCase();
  const text = `${status} ${message}`.trim();

  if (/(success|sukses|berhasil|done|complete)/.test(text)) return "success";
  if (/(pending|process|processing|menunggu)/.test(text)) return "pending";
  if (/(fail|failed|gagal|error|cancel|reject)/.test(text)) return "failed";

  return "pending";
}

function normalizeStock(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return true;
  return !["0", "false", "inactive", "off", "empty", "habis", "soldout"].includes(text);
}

function pickString(record: Agenh2hRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function pickNumber(record: Agenh2hRecord, keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string" && value.trim()) {
      const numeric = Number(value.replace(/[^\d.-]/g, ""));
      if (Number.isFinite(numeric)) return numeric;
    }
  }
  return 0;
}

function isRecord(value: unknown): value is Agenh2hRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
