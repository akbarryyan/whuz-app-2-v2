import { prisma } from "@/src/infra/db/prisma";
import { ProviderType } from "@/src/core/domain/enums/provider.enum";

export interface ProviderLogData {
  provider: string;
  action: string;
  request?: any;
  response?: any;
  success: boolean;
  errorMessage?: string;
  latency: number;
}

export interface ProductSyncData {
  provider: string;
  providerCode: string;
  name: string;
  category: string;
  brand: string;
  type: string;
  providerPrice: number;
  stock: boolean;
  description?: string;
}

export interface ProviderSettingData {
  provider: string;
  defaultMargin: number;
  marginType: "FIXED" | "PERCENTAGE";
  isActive: boolean;
}

export class ProviderRepository {
  /**
   * Save provider log to database
   */
  async saveProviderLog(data: ProviderLogData) {
    try {
      return await prisma.providerLog.create({
        data: {
          provider: data.provider,
          action: data.action,
          request: data.request || null,
          response: data.response || null,
          success: data.success,
          errorMessage: data.errorMessage || null,
          latency: data.latency,
        },
      });
    } catch (error) {
      console.error("Failed to save provider log:", error);
      // Don't throw - logging failure shouldn't break the flow
      return null;
    }
  }

  /**
   * Sync products from provider to database
   */
  async syncProducts(provider: ProviderType, products: ProductSyncData[]) {
    try {
      // Get provider settings untuk ambil default margin
      const providerSetting = await this.getProviderSetting(provider);
      const defaultMargin = providerSetting?.defaultMargin 
        ? Number(providerSetting.defaultMargin) 
        : 0;
      const marginType = providerSetting?.marginType || "FIXED";

      const results = await Promise.allSettled(
        products.map((product) => {
          // Calculate margin and selling price
          const providerPrice = product.providerPrice;
          let margin = defaultMargin;
          let sellingPrice = providerPrice;

          if (marginType === "PERCENTAGE") {
            // Margin percentage
            margin = (providerPrice * defaultMargin) / 100;
            sellingPrice = providerPrice + margin;
          } else {
            // Fixed margin
            sellingPrice = providerPrice + defaultMargin;
          }

          return prisma.product.upsert({
            where: {
              provider_providerCode: {
                provider: provider,
                providerCode: product.providerCode,
              },
            },
            create: {
              provider: provider,
              providerCode: product.providerCode,
              name: product.name,
              category: product.category,
              brand: product.brand,
              type: product.type,
              providerPrice: providerPrice,
              margin: margin,
              sellingPrice: sellingPrice,
              stock: product.stock,
              description: product.description,
              isActive: true,
              lastSyncAt: new Date(),
            },
            update: {
              name: product.name,
              providerPrice: providerPrice,
              margin: margin,
              sellingPrice: sellingPrice,
              stock: product.stock,
              description: product.description,
              lastSyncAt: new Date(),
            },
          });
        })
      );

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      return { succeeded, failed, total: products.length };
    } catch (error) {
      console.error("Failed to sync products:", error);
      throw error;
    }
  }

  /**
   * Get provider logs with filters
   */
  async getProviderLogs(options: {
    provider?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }) {
    const { provider, action, limit = 50, offset = 0 } = options;

    return await prisma.providerLog.findMany({
      where: {
        ...(provider && { provider }),
        ...(action && { action }),
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get products from database with filters
   */
  async getProducts(options: {
    provider?: string;
    category?: string;
    brand?: string;
    isActive?: boolean;
    stock?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const {
      provider,
      category,
      brand,
      isActive = true,
      stock,
      limit = 100,
      offset = 0,
    } = options;

    return await prisma.product.findMany({
      where: {
        ...(provider && { provider }),
        ...(category && { category }),
        ...(brand && { brand }),
        ...(isActive !== undefined && { isActive }),
        ...(stock !== undefined && { stock }),
      },
      orderBy: [{ category: "asc" }, { sellingPrice: "asc" }],
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get product statistics
   */
  async getProductStats() {
    const [total, active, inStock, byProvider, byCategory] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: true, stock: true } }),
      prisma.product.groupBy({
        by: ["provider"],
        _count: true,
      }),
      prisma.product.groupBy({
        by: ["category"],
        _count: true,
        orderBy: { _count: { category: "desc" } },
      }),
    ]);

    return {
      total,
      active,
      inStock,
      byProvider,
      byCategory,
    };
  }

  /**
   * Get or create provider setting
   */
  async getProviderSetting(provider: string) {
    return await prisma.providerSetting.findUnique({
      where: { provider },
    });
  }

  /**
   * Upsert provider setting
   */
  async upsertProviderSetting(data: ProviderSettingData) {
    return await prisma.providerSetting.upsert({
      where: { provider: data.provider },
      create: {
        provider: data.provider,
        defaultMargin: data.defaultMargin,
        marginType: data.marginType,
        isActive: data.isActive,
      },
      update: {
        defaultMargin: data.defaultMargin,
        marginType: data.marginType,
        isActive: data.isActive,
      },
    });
  }

  /**
   * Update provider balance cache
   */
  async updateProviderBalance(provider: string, balance: number) {
    return await prisma.providerSetting.upsert({
      where: { provider },
      create: {
        provider,
        lastBalance: balance,
        lastBalanceAt: new Date(),
        defaultMargin: 0,
        marginType: "FIXED",
      },
      update: {
        lastBalance: balance,
        lastBalanceAt: new Date(),
      },
    });
  }

  /**
   * Get all provider settings
   */
  async getAllProviderSettings() {
    return await prisma.providerSetting.findMany({
      orderBy: { provider: "asc" },
    });
  }

  /**
   * Update product margin
   */
  async updateProductMargin(productId: string, margin: number) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    const sellingPrice = Number(product.providerPrice) + margin;

    return await prisma.product.update({
      where: { id: productId },
      data: {
        margin,
        sellingPrice,
      },
    });
  }
}
