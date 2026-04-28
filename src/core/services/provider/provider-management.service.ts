import { ProviderFactory } from "@/src/infra/providers/provider.factory";
import { ProviderType, ProviderMode, ProviderStatus } from "@/src/core/domain/enums/provider.enum";
import {
  ProviderBalance,
  ProviderProduct,
  ProviderHealthCheck,
} from "@/src/core/ports/provider.port";
import { ProviderRepository } from "@/src/infra/db/repositories/provider.repository";

export interface ProviderInfo {
  type: ProviderType;
  mode: ProviderMode;
  balance: ProviderBalance;
  health: ProviderHealthCheck;
}

export class ProviderManagementService {
  private repository: ProviderRepository;

  constructor() {
    this.repository = new ProviderRepository();
  }
  /**
   * Get all providers info (balance, health, mode)
   */
  async getAllProvidersInfo(): Promise<ProviderInfo[]> {
    const providers = ProviderFactory.getAllProviders();
    const modes = ProviderFactory.getProviderModes();

    const providersInfo = await Promise.all(
      providers.map(async (provider) => {
        const type = provider.getProviderType();
        const startTime = Date.now();
        
        try {
          const [balance, health] = await Promise.all([
            provider.checkBalance(),
            provider.healthCheck(),
          ]);

          // Log successful balance check
          await this.repository.saveProviderLog({
            provider: type,
            action: "checkBalance",
            request: {},
            response: { balance: balance.balance, currency: balance.currency },
            success: true,
            latency: Date.now() - startTime,
          });

          return {
            type,
            mode: modes[type],
            balance,
            health,
          };
        } catch (error) {
          // Log failed operation
          await this.repository.saveProviderLog({
            provider: type,
            action: "checkBalance",
            request: {},
            success: false,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
            latency: Date.now() - startTime,
          });

          // Return degraded state if provider fails
          return {
            type,
            mode: modes[type],
            balance: {
              provider: type,
              balance: 0,
              currency: "IDR",
              lastUpdated: new Date(),
            },
            health: {
              provider: type,
              status: ProviderStatus.OFFLINE,
              latency: 0,
              lastCheck: new Date(),
              message: error instanceof Error ? error.message : "Unknown error",
            },
          };
        }
      })
    );

    return providersInfo;
  }

  /**
   * Get specific provider info
   */
  async getProviderInfo(providerType: ProviderType): Promise<ProviderInfo> {
    const provider = ProviderFactory.create(providerType);
    const modes = ProviderFactory.getProviderModes();

    try {
      const [balance, health] = await Promise.all([
        provider.checkBalance(),
        provider.healthCheck(),
      ]);

      return {
        type: providerType,
        mode: modes[providerType],
        balance,
        health,
      };
    } catch (error) {
      return {
        type: providerType,
        mode: modes[providerType],
        balance: {
          provider: providerType,
          balance: 0,
          currency: "IDR",
          lastUpdated: new Date(),
        },
        health: {
          provider: providerType,
          status: ProviderStatus.OFFLINE,
          latency: 0,
          lastCheck: new Date(),
          message: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  /**
   * Get products from specific provider
   */
  async getProviderProducts(providerType: ProviderType): Promise<ProviderProduct[]> {
    const provider = ProviderFactory.create(providerType);
    const startTime = Date.now();

    try {
      const products = await provider.getProducts();
      
      // Log successful operation
      await this.repository.saveProviderLog({
        provider: providerType,
        action: "getProducts",
        request: {},
        response: { count: products.length },
        success: true,
        latency: Date.now() - startTime,
      });

      // Sync products to database (run in background)
      this.repository.syncProducts(
        providerType,
        products.map((p) => ({
          provider: providerType,
          providerCode: p.providerCode,
          name: p.providerName,
          category: p.category,
          brand: p.brand,
          type: p.type,
          providerPrice: p.price,
          stock: p.stock,
          description: p.description,
        }))
      ).catch((error) => {
        console.error(`Failed to sync products for ${providerType}:`, error);
      });

      return products;
    } catch (error) {
      // Log failed operation
      await this.repository.saveProviderLog({
        provider: providerType,
        action: "getProducts",
        request: {},
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        latency: Date.now() - startTime,
      });

      throw error;
    }
  }

  /**
   * Get products from all providers
   */
  async getAllProviderProducts(): Promise<Map<ProviderType, ProviderProduct[]>> {
    const providers = ProviderFactory.getAllProviders();
    const productsMap = new Map<ProviderType, ProviderProduct[]>();

    await Promise.all(
      providers.map(async (provider) => {
        const type = provider.getProviderType();
        const startTime = Date.now();

        try {
          const products = await provider.getProducts();
          productsMap.set(type, products);

          // Log successful operation
          await this.repository.saveProviderLog({
            provider: type,
            action: "getProducts",
            request: {},
            response: { count: products.length },
            success: true,
            latency: Date.now() - startTime,
          });

          // Sync products to database (background)
          this.repository.syncProducts(
            type,
            products.map((p) => ({
              provider: type,
              providerCode: p.providerCode,
              name: p.providerName,
              category: p.category,
              brand: p.brand,
              type: p.type,
              providerPrice: p.price,
              stock: p.stock,
              description: p.description,
            }))
          ).catch((error) => {
            console.error(`Failed to sync products for ${type}:`, error);
          });
        } catch (error) {
          console.error(`Failed to get products from ${type}:`, error);
          productsMap.set(type, []);

          // Log failed operation
          await this.repository.saveProviderLog({
            provider: type,
            action: "getProducts",
            request: {},
            success: false,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
            latency: Date.now() - startTime,
          });
        }
      })
    );

    return productsMap;
  }

  /**
   * Test provider connection
   */
  async testProviderConnection(providerType: ProviderType): Promise<ProviderHealthCheck> {
    const provider = ProviderFactory.create(providerType);
    const startTime = Date.now();

    try {
      const health = await provider.healthCheck();

      // Log successful health check
      await this.repository.saveProviderLog({
        provider: providerType,
        action: "healthCheck",
        request: {},
        response: { status: health.status, latency: health.latency },
        success: true,
        latency: Date.now() - startTime,
      });

      return health;
    } catch (error) {
      // Log failed health check
      await this.repository.saveProviderLog({
        provider: providerType,
        action: "healthCheck",
        request: {},
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        latency: Date.now() - startTime,
      });

      throw error;
    }
  }

  /**
   * Get provider logs from database
   */
  async getProviderLogs(options: {
    provider?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }) {
    return await this.repository.getProviderLogs(options);
  }

  /**
   * Get product statistics
   */
  async getProductStats() {
    return await this.repository.getProductStats();
  }

  /**
   * Check balance for specific provider (on-demand)
   */
  async checkProviderBalance(providerType: ProviderType): Promise<ProviderBalance> {
    const provider = ProviderFactory.create(providerType);
    const startTime = Date.now();

    try {
      const balance = await provider.checkBalance();

      // Log successful operation
      await this.repository.saveProviderLog({
        provider: providerType,
        action: "checkBalance",
        request: {},
        response: { balance: balance.balance, currency: balance.currency },
        success: true,
        latency: Date.now() - startTime,
      });

      // Update cached balance in provider settings
      await this.repository.updateProviderBalance(providerType, balance.balance);

      return balance;
    } catch (error) {
      // Log failed operation
      await this.repository.saveProviderLog({
        provider: providerType,
        action: "checkBalance",
        request: {},
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        latency: Date.now() - startTime,
      });

      throw error;
    }
  }

  /**
   * Sync products from specific provider (on-demand)
   */
  async syncProviderProducts(providerType: ProviderType): Promise<ProviderProduct[]> {
    const provider = ProviderFactory.create(providerType);
    const startTime = Date.now();

    try {
      const products = await provider.getProducts();

      // Log successful operation
      await this.repository.saveProviderLog({
        provider: providerType,
        action: "syncProducts",
        request: {},
        response: { count: products.length },
        success: true,
        latency: Date.now() - startTime,
      });

      // Sync products to database with margin calculation
      await this.repository.syncProducts(
        providerType,
        products.map((p) => ({
          provider: providerType,
          providerCode: p.providerCode,
          name: p.providerName,
          category: p.category || p.type || "Other",
          brand: p.brand || "Other",
          type: p.type || "other",
          providerPrice: p.price,
          stock: p.stock,
          description: p.description === null ? undefined : p.description,
        }))
      );

      return products;
    } catch (error) {
      // Log failed operation
      await this.repository.saveProviderLog({
        provider: providerType,
        action: "syncProducts",
        request: {},
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        latency: Date.now() - startTime,
      });

      throw error;
    }
  }
}
