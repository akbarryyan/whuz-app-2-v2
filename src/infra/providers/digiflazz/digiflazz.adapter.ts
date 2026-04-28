import {
  IProviderPort,
  ProviderBalance,
  ProviderProduct,
  ProviderPurchaseRequest,
  ProviderPurchaseResponse,
  ProviderHealthCheck,
} from "@/src/core/ports/provider.port";
import { ProviderType, ProviderStatus } from "@/src/core/domain/enums/provider.enum";
import { ProviderError } from "@/src/core/domain/errors/provider.errors";
import { getSiteConfigValue } from "@/lib/site-config";

export class DigiflazzAdapter implements IProviderPort {
  private apiKey = "";
  private username = "";
  private baseUrl = "https://api.digiflazz.com/v1";

  private async ensureConfig(): Promise<void> {
    const [apiKey, username, baseUrl] = await Promise.all([
      getSiteConfigValue("DIGIFLAZZ_API_KEY"),
      getSiteConfigValue("DIGIFLAZZ_USERNAME"),
      getSiteConfigValue("DIGIFLAZZ_BASE_URL", "https://api.digiflazz.com/v1"),
    ]);

    this.apiKey = apiKey;
    this.username = username;
    this.baseUrl = baseUrl || "https://api.digiflazz.com/v1";
  }

  getProviderType(): ProviderType {
    return ProviderType.DIGIFLAZZ;
  }

  async checkBalance(): Promise<ProviderBalance> {
    try {
      await this.ensureConfig();
      const response = await fetch(`${this.baseUrl}/cek-saldo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cmd: "deposit",
          username: this.username,
          sign: this.generateSignature("depo"),
        }),
      });

      if (!response.ok) {
        throw new ProviderError(
          `Digiflazz API error: ${response.statusText}`,
          "DIGIFLAZZ"
        );
      }

      const data = await response.json();

      return {
        provider: ProviderType.DIGIFLAZZ,
        balance: parseFloat(data.data?.deposit || "0"),
        currency: "IDR",
        lastUpdated: new Date(),
      };
    } catch (error) {
      throw new ProviderError(
        `Failed to check Digiflazz balance: ${error instanceof Error ? error.message : "Unknown error"}`,
        "DIGIFLAZZ"
      );
    }
  }

  async getProducts(): Promise<ProviderProduct[]> {
    try {
      await this.ensureConfig();
      const response = await fetch(`${this.baseUrl}/price-list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cmd: "prepaid",
          username: this.username,
          sign: this.generateSignature("pricelist"),
        }),
      });

      if (!response.ok) {
        throw new ProviderError(
          `Digiflazz API error: ${response.statusText}`,
          "DIGIFLAZZ"
        );
      }

      const data = await response.json();

      if (!data.data || !Array.isArray(data.data)) {
        return [];
      }

      return data.data.map((item: any) => ({
        providerCode: item.buyer_sku_code,
        providerName: item.product_name,
        category: item.category,
        brand: item.brand,
        type: item.type,
        price: parseFloat(item.price),
        stock: item.seller_product_status === true || item.buyer_product_status === true,
        description: item.desc,
      }));
    } catch (error) {
      throw new ProviderError(
        `Failed to get Digiflazz products: ${error instanceof Error ? error.message : "Unknown error"}`,
        "DIGIFLAZZ"
      );
    }
  }

  async purchase(request: ProviderPurchaseRequest): Promise<ProviderPurchaseResponse> {
    try {
      await this.ensureConfig();
      const refId = `TRX-${Date.now()}`;
      
      const response = await fetch(`${this.baseUrl}/transaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: this.username,
          buyer_sku_code: request.productCode,
          customer_no: request.target,
          ref_id: refId,
          sign: this.generateSignature(refId),
        }),
      });

      if (!response.ok) {
        throw new ProviderError(
          `Digiflazz API error: ${response.statusText}`,
          "DIGIFLAZZ"
        );
      }

      const data = await response.json();
      const digiStatus: string = data.data?.status ?? "";

      const status =
        digiStatus === "Sukses" ? "success"
        : digiStatus === "Pending" ? "pending"
        : "failed";

      return {
        success: status === "success",
        status,
        transactionId: data.data?.trx_id || refId,
        serialNumber: data.data?.sn,
        message: data.data?.message || "Transaction processed",
        rawResponse: data,
      };
    } catch (error) {
      throw new ProviderError(
        `Failed to purchase from Digiflazz: ${error instanceof Error ? error.message : "Unknown error"}`,
        "DIGIFLAZZ"
      );
    }
  }

  async checkStatus(providerRef: string): Promise<ProviderPurchaseResponse> {
    // Digiflazz is idempotent on ref_id — re-posting the same ref returns the current status
    try {
      await this.ensureConfig();
      const response = await fetch(`${this.baseUrl}/transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: this.username,
          buyer_sku_code: "", // Not needed for status check via ref_id
          customer_no: "",
          ref_id: providerRef,
          sign: this.generateSignature(providerRef),
        }),
      });

      if (!response.ok) {
        throw new ProviderError(`Digiflazz checkStatus error: ${response.statusText}`, "DIGIFLAZZ");
      }

      const data = await response.json();
      const digiStatus: string = data.data?.status ?? "";

      const status =
        digiStatus === "Sukses" ? "success"
        : digiStatus === "Pending" ? "pending"
        : "failed";

      return {
        success: status === "success",
        status,
        transactionId: data.data?.trx_id || providerRef,
        serialNumber: data.data?.sn,
        message: data.data?.message || digiStatus,
        rawResponse: data,
      };
    } catch (error) {
      throw new ProviderError(
        `Failed to checkStatus from Digiflazz: ${error instanceof Error ? error.message : "Unknown error"}`,
        "DIGIFLAZZ"
      );
    }
  }

  async healthCheck(): Promise<ProviderHealthCheck> {
    const startTime = Date.now();
    
    try {
      await this.checkBalance();
      const latency = Date.now() - startTime;

      return {
        provider: ProviderType.DIGIFLAZZ,
        status: ProviderStatus.ONLINE,
        latency,
        lastCheck: new Date(),
        message: "Provider is healthy",
      };
    } catch (error) {
      const latency = Date.now() - startTime;

      return {
        provider: ProviderType.DIGIFLAZZ,
        status: ProviderStatus.OFFLINE,
        latency,
        lastCheck: new Date(),
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private generateSignature(refId: string): string {
    const crypto = require("crypto");
    const md5 = crypto.createHash("md5");
    md5.update(this.username + this.apiKey + refId);
    return md5.digest("hex");
  }
}
