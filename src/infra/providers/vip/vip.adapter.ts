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

export class VipResellerAdapter implements IProviderPort {
  private apiKey = "";
  private apiId = "";
  private sign = "";
  private baseUrl = "https://vip-reseller.co.id/api";

  private async ensureConfig(): Promise<void> {
    const [apiKey, apiId, sign, baseUrl] = await Promise.all([
      getSiteConfigValue("VIP_API_KEY"),
      getSiteConfigValue("VIP_API_ID"),
      getSiteConfigValue("VIP_SIGN"),
      getSiteConfigValue("VIP_BASE_URL", "https://vip-reseller.co.id/api"),
    ]);

    this.apiKey = apiKey;
    this.apiId = apiId;
    this.sign = sign;
    this.baseUrl = baseUrl || "https://vip-reseller.co.id/api";
  }

  getProviderType(): ProviderType {
    return ProviderType.VIP_RESELLER;
  }

  async checkBalance(): Promise<ProviderBalance> {
    try {
      await this.ensureConfig();
      // VIP Reseller: sign = MD5(API_ID + API_KEY)
      const sign = this.sign || this.generateSignature();
      
      const requestBody = {
        key: this.apiKey,
        sign: sign,
      };

      console.log("[VIP] Check balance request:", {
        url: `${this.baseUrl}/profile`,
        hasApiKey: !!this.apiKey,
        hasSign: !!sign,
      });

      const response = await fetch(`${this.baseUrl}/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(requestBody).toString(),
      });

      if (!response.ok) {
        throw new ProviderError(
          `VIP Reseller API error: ${response.statusText}`,
          "VIP_RESELLER"
        );
      }

      const data = await response.json();

      if (data.result === false) {
        throw new ProviderError(
          data.message || "Failed to check balance",
          "VIP_RESELLER"
        );
      }

      return {
        provider: ProviderType.VIP_RESELLER,
        balance: parseFloat(data.data?.balance || "0"),
        currency: "IDR",
        lastUpdated: new Date(),
      };
    } catch (error) {
      throw new ProviderError(
        `Failed to check VIP balance: ${error instanceof Error ? error.message : "Unknown error"}`,
        "VIP_RESELLER"
      );
    }
  }

  async getProducts(): Promise<ProviderProduct[]> {
    await this.ensureConfig();
    const sign = this.sign || this.generateSignature();

    const endpoints: Array<{ url: string; defaultType: string }> = [
      { url: `${this.baseUrl}/prepaid`, defaultType: "prepaid" },
      { url: `${this.baseUrl}/game-feature`, defaultType: "game" },
    ];

    const fetchEndpoint = async (url: string, defaultType: string): Promise<ProviderProduct[]> => {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            key: this.apiKey,
            sign: sign,
            type: "services",
          }).toString(),
        });

        if (!response.ok) {
          console.warn(`[VIP] ${url} returned ${response.status}: ${response.statusText}`);
          return [];
        }

        const data = await response.json();

        if (data.result === false) {
          console.warn(`[VIP] ${url} result=false: ${data.message}`);
          return [];
        }

        if (!data.data || !Array.isArray(data.data)) {
          return [];
        }

        return data.data.map((item: any) => ({
          providerCode: item.code,
          providerName: item.name,
          category: item.category || item.game || defaultType,
          brand: item.brand || item.game || "Other",
          type: item.type || defaultType,
          price: parseFloat(item.price?.basic || item.price || "0"),
          stock: item.status === "available" || item.seller_product_status === "available",
          description: item.description || null,
        }));
      } catch (err) {
        console.warn(`[VIP] Failed to fetch ${url}:`, err);
        return [];
      }
    };

    try {
      const results = await Promise.all(
        endpoints.map(({ url, defaultType }) => fetchEndpoint(url, defaultType))
      );

      const allProducts = results.flat();

      // Deduplicate by providerCode (in case of overlap)
      const seen = new Set<string>();
      const unique = allProducts.filter((p) => {
        if (seen.has(p.providerCode)) return false;
        seen.add(p.providerCode);
        return true;
      });

      console.log(
        `[VIP] getProducts: prepaid=${results[0].length}, game-feature=${results[1].length}, total=${unique.length}`
      );

      return unique;
    } catch (error) {
      throw new ProviderError(
        `Failed to get VIP products: ${error instanceof Error ? error.message : "Unknown error"}`,
        "VIP_RESELLER"
      );
    }
  }

  async purchase(request: ProviderPurchaseRequest): Promise<ProviderPurchaseResponse> {
    try {
      await this.ensureConfig();
      const sign = this.sign || this.generateSignature();
      const productType = request.additionalData?._productType as string | undefined;
      const isJoki = productType === "joki";
      const isGame = !isJoki && (!!(request.additionalData?.zone) || productType === "game");
      const refId = isJoki
        ? `JOKI-VIP-${Date.now()}`
        : isGame
        ? `GAME-VIP-${Date.now()}`
        : `VIP-${Date.now()}`;

      let body: Record<string, string>;
      let endpoint: string;

      if (isJoki) {
        // Joki: POST /game-feature, parameters berbeda dari top-up game
        // data_no = email/username, data_zone = password akun
        endpoint = `${this.baseUrl}/game-feature`;
        body = {
          key: this.apiKey,
          sign,
          type: "order",
          service: request.productCode,
          data_no: request.target,                                         // email/username
          data_zone: String(request.additionalData?.password ?? ""),       // password akun
          additional_data: String(request.additionalData?.additional_data ?? ""), // Login|Nick|Hero|Catatan
          quantity: String(request.additionalData?.quantity ?? 1),
          ref_id: refId,
        };
      } else if (isGame) {
        // Game & Streaming top-up: POST /game-feature
        endpoint = `${this.baseUrl}/game-feature`;
        body = {
          key: this.apiKey,
          sign,
          type: "order",
          service: request.productCode,
          data_no: request.target,
          ref_id: refId,
        };
        // Zone / server_id: only include if the game actually requires it
        const zone = request.additionalData?.zone ?? request.additionalData?.server_id;
        if (zone !== undefined && zone !== null && zone !== "") {
          body.zone = String(zone);
        }
      } else {
        // Prepaid (pulsa, paket data, token listrik, dll): POST /prepaid
        endpoint = `${this.baseUrl}/prepaid`;
        body = {
          key: this.apiKey,
          sign,
          type: "order",
          service: request.productCode,
          data_no: request.target,
          ref_id: refId,
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(body).toString(),
      });

      if (!response.ok) {
        throw new ProviderError(
          `VIP Reseller API error: ${response.statusText}`,
          "VIP_RESELLER"
        );
      }

      const data = await response.json();

      // Status field: for game-feature response is same structure as prepaid
      const item = Array.isArray(data.data) ? data.data[0] : data.data;
      const vipStatus: string = item?.status ?? data.data?.status ?? "";

      // "waiting" dari joki = pending (akan diproses manual oleh joki)
      const status: "success" | "pending" | "failed" =
        vipStatus === "success" ? "success"
        : (vipStatus === "pending" || vipStatus === "waiting" || vipStatus === "processing") ? "pending"
        : "failed";

      return {
        success: data.result === true && status === "success",
        status,
        // Use refId as transactionId (VIP trx_id may come in item.trxid)
        transactionId: item?.trxid || data.data?.trx_id || refId,
        // SN in "sn" for prepaid, "note" for games/joki
        serialNumber: item?.sn || item?.note || data.data?.sn || data.data?.note || undefined,
        message: item?.note || data.data?.message || data.message || "Transaction processed",
        rawResponse: data,
      };
    } catch (error) {
      throw new ProviderError(
        `Failed to purchase from VIP: ${error instanceof Error ? error.message : "Unknown error"}`,
        "VIP_RESELLER"
      );
    }
  }

  async checkStatus(providerRef: string): Promise<ProviderPurchaseResponse> {
    // Determine endpoint from providerRef prefix:
    //   "GAME-VIP-..." or "JOKI-VIP-..." → /game-feature
    //   "VIP-..." or others              → /prepaid
    const isGameOrJoki = providerRef.startsWith("GAME-VIP-") || providerRef.startsWith("JOKI-VIP-");
    const endpoint = isGameOrJoki
      ? `${this.baseUrl}/game-feature`
      : `${this.baseUrl}/prepaid`;

    try {
      await this.ensureConfig();
      const sign = this.sign || this.generateSignature();

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          key: this.apiKey,
          sign,
          type: "status",
          trxid: providerRef,
        }).toString(),
      });

      if (!response.ok) {
        throw new ProviderError(`VIP checkStatus error: ${response.statusText}`, "VIP_RESELLER");
      }

      const data = await response.json();

      // data.data is an array — take first item
      const item = Array.isArray(data.data) ? data.data[0] : data.data;
      const vipStatus: string = item?.status ?? "";

      const status: "success" | "pending" | "failed" =
        vipStatus === "success" ? "success"
        : (vipStatus === "pending" || vipStatus === "waiting" || vipStatus === "processing") ? "pending"
        : "failed";

      return {
        success: data.result === true && status === "success",
        status,
        transactionId: item?.trxid || providerRef,
        // VIP returns SN in the "note" field
        serialNumber: item?.note || item?.sn || undefined,
        message: item?.note || data.message || vipStatus,
        rawResponse: data,
      };
    } catch (error) {
      throw new ProviderError(
        `Failed to checkStatus from VIP: ${error instanceof Error ? error.message : "Unknown error"}`,
        "VIP_RESELLER"
      );
    }
  }

  async healthCheck(): Promise<ProviderHealthCheck> {
    const startTime = Date.now();
    
    try {
      await this.checkBalance();
      const latency = Date.now() - startTime;

      return {
        provider: ProviderType.VIP_RESELLER,
        status: ProviderStatus.ONLINE,
        latency,
        lastCheck: new Date(),
        message: "Provider is healthy",
      };
    } catch (error) {
      const latency = Date.now() - startTime;

      return {
        provider: ProviderType.VIP_RESELLER,
        status: ProviderStatus.OFFLINE,
        latency,
        lastCheck: new Date(),
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private generateSignature(additionalData?: string): string {
    // If static sign is provided in env, use it (VIP often uses static sign)
    if (this.sign) {
      console.log("[VIP] Using static sign from env");
      return this.sign;
    }

    // VIP Reseller signature: MD5(API_ID + API_KEY) or MD5(API_ID + API_KEY + additionalData)
    console.log("[VIP] Generating dynamic signature");
    const crypto = require("crypto");
    const md5 = crypto.createHash("md5");
    const signString = additionalData 
      ? this.apiId + this.apiKey + additionalData 
      : this.apiId + this.apiKey;
    md5.update(signString);
    const signature = md5.digest("hex");
    console.log("[VIP] Generated signature (first 10 chars):", signature.substring(0, 10));
    return signature;
  }
}
