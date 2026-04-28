import {
  IProviderPort,
  ProviderBalance,
  ProviderProduct,
  ProviderPurchaseRequest,
  ProviderPurchaseResponse,
  ProviderHealthCheck,
} from "@/src/core/ports/provider.port";
import { ProviderType, ProviderStatus } from "@/src/core/domain/enums/provider.enum";

type MockScenario = "random" | "success" | "failed" | "pending" | "pending_then_success";

export class MockProviderAdapter implements IProviderPort {
  private providerType: ProviderType;
  private scenario: MockScenario;
  private delayMs: number;

  constructor(providerType: ProviderType) {
    this.providerType = providerType;
    this.scenario = (process.env.MOCK_PROVIDER_SCENARIO as MockScenario) || "success";
    this.delayMs = parseInt(process.env.MOCK_PROVIDER_DELAY_MS || "1000");
  }

  getProviderType(): ProviderType {
    return this.providerType;
  }

  async checkBalance(): Promise<ProviderBalance> {
    await this.simulateDelay();

    return {
      provider: this.providerType,
      balance: Math.random() * 10000000 + 5000000, // Random between 5M - 15M
      currency: "IDR",
      lastUpdated: new Date(),
    };
  }

  async getProducts(): Promise<ProviderProduct[]> {
    await this.simulateDelay();

    return this.getMockProducts();
  }

  async purchase(request: ProviderPurchaseRequest): Promise<ProviderPurchaseResponse> {
    await this.simulateDelay();

    const transactionId = `MOCK-${this.providerType}-${Date.now()}`;
    const scenario = this.determineScenario();

    switch (scenario) {
      case "success":
        return {
          success: true,
          status: "success",
          transactionId,
          serialNumber: this.generateMockSN(request.productCode),
          message: "Transaction successful (MOCK)",
          rawResponse: { mock: true, scenario: "success" },
        };

      case "failed":
        return {
          success: false,
          status: "failed",
          transactionId,
          message: "Transaction failed (MOCK)",
          rawResponse: { mock: true, scenario: "failed" },
        };

      case "pending":
      case "pending_then_success":
        return {
          success: false,
          status: "pending",
          transactionId,
          message: "Transaction pending (MOCK)",
          rawResponse: { mock: true, scenario: "pending" },
        };

      default:
        return {
          success: true,
          status: "success",
          transactionId,
          serialNumber: this.generateMockSN(request.productCode),
          message: "Transaction successful (MOCK)",
          rawResponse: { mock: true, scenario: "default" },
        };
    }
  }

  async checkStatus(providerRef: string): Promise<ProviderPurchaseResponse> {
    await this.simulateDelay();
    // Mock: checkStatus always resolves to success (simulates provider finalised the order)
    return {
      success: true,
      status: "success",
      transactionId: providerRef,
      serialNumber: `SN-CHECK-${Date.now()}`,
      message: "Transaction successful (MOCK checkStatus)",
      rawResponse: { mock: true, scenario: "checkStatus_success" },
    };
  }

  async healthCheck(): Promise<ProviderHealthCheck> {
    const startTime = Date.now();
    await this.simulateDelay(100); // Quick health check
    const latency = Date.now() - startTime;

    return {
      provider: this.providerType,
      status: ProviderStatus.ONLINE,
      latency,
      lastCheck: new Date(),
      message: "Mock provider is always healthy",
    };
  }

  private async simulateDelay(customDelay?: number): Promise<void> {
    const delay = customDelay || this.delayMs;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  private determineScenario(): MockScenario {
    if (this.scenario === "random") {
      const scenarios: MockScenario[] = ["success", "failed", "pending"];
      return scenarios[Math.floor(Math.random() * scenarios.length)];
    }
    return this.scenario;
  }

  private generateMockSN(productCode: string): string {
    // Generate mock serial number based on product type
    if (productCode.includes("PLN")) {
      return Array.from({ length: 20 }, () => Math.floor(Math.random() * 10)).join("");
    }
    return `SN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  private getMockProducts(): ProviderProduct[] {
    const baseProducts = [
      {
        providerCode: "PLN100",
        providerName: "PLN Token 100K",
        category: "PLN",
        brand: "PLN",
        type: "prepaid",
        price: 102500,
        stock: true,
        description: "Token PLN 100.000",
      },
      {
        providerCode: "PLN200",
        providerName: "PLN Token 200K",
        category: "PLN",
        brand: "PLN",
        type: "prepaid",
        price: 202500,
        stock: true,
        description: "Token PLN 200.000",
      },
      {
        providerCode: "TSEL50",
        providerName: "Telkomsel 50K",
        category: "Pulsa",
        brand: "Telkomsel",
        type: "prepaid",
        price: 51000,
        stock: true,
        description: "Pulsa Telkomsel 50.000",
      },
      {
        providerCode: "TSEL100",
        providerName: "Telkomsel 100K",
        category: "Pulsa",
        brand: "Telkomsel",
        type: "prepaid",
        price: 99500,
        stock: true,
        description: "Pulsa Telkomsel 100.000",
      },
      {
        providerCode: "ML86",
        providerName: "Mobile Legends 86 Diamonds",
        category: "Game",
        brand: "Mobile Legends",
        type: "voucher",
        price: 22000,
        stock: true,
        description: "Mobile Legends 86 Diamonds",
      },
      {
        providerCode: "ML344",
        providerName: "Mobile Legends 344 Diamonds",
        category: "Game",
        brand: "Mobile Legends",
        type: "voucher",
        price: 86000,
        stock: true,
        description: "Mobile Legends 344 Diamonds",
      },
      {
        providerCode: "FF720",
        providerName: "Free Fire 720 Diamonds",
        category: "Game",
        brand: "Free Fire",
        type: "voucher",
        price: 96800,
        stock: true,
        description: "Free Fire 720 Diamonds",
      },
      {
        providerCode: "GOPAY50",
        providerName: "GoPay 50K",
        category: "E-Wallet",
        brand: "GoPay",
        type: "prepaid",
        price: 51500,
        stock: true,
        description: "Top up GoPay 50.000",
      },
    ];

    // Add provider prefix to differentiate
    return baseProducts.map((p) => ({
      ...p,
      providerCode: `${this.providerType}_${p.providerCode}`,
      providerName: `[${this.providerType}] ${p.providerName}`,
    }));
  }
}
