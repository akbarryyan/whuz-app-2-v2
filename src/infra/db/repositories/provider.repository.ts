import { prisma } from "@/src/infra/db/prisma";
import { ProviderType } from "@/src/core/domain/enums/provider.enum";
import { Prisma } from "@prisma/client";
import { normalizeBrandKey } from "@/lib/brand-utils";
import { upsertBrandByName } from "@/lib/brand-store";

export interface ProviderLogData {
  provider: string;
  action: string;
  request?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  response?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
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
          request: data.request ?? Prisma.JsonNull,
          response: data.response ?? Prisma.JsonNull,
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
      const [brandMetas, existingBrands, existingBrandRecords] = await Promise.all([
        prisma.brandMeta.findMany({
          select: { brand: true },
        }),
        prisma.product.findMany({
          select: { brand: true },
          distinct: ["brand"],
        }),
        prisma.$queryRaw<Array<{ id: string; name: string }>>`
          SELECT id, name FROM brands
        `,
      ]);

      const canonicalBrandMap = new Map<string, string>();
      const brandIdMap = new Map<string, string>();
      for (const brandRecord of existingBrandRecords) {
        canonicalBrandMap.set(normalizeBrandKey(brandRecord.name), brandRecord.name);
        brandIdMap.set(brandRecord.name, brandRecord.id);
      }
      for (const item of existingBrands) {
        canonicalBrandMap.set(normalizeBrandKey(item.brand), item.brand);
      }
      for (const meta of brandMetas) {
        canonicalBrandMap.set(normalizeBrandKey(meta.brand), meta.brand);
      }

      const canonicalProducts = products.map((product) => {
        const canonicalBrand = canonicalBrandMap.get(normalizeBrandKey(product.brand)) || product.brand;
        return {
          ...product,
          brand: canonicalBrand,
        };
      });

      const uniqueCanonicalBrands = Array.from(new Set(canonicalProducts.map((item) => item.brand)));
      for (const brand of uniqueCanonicalBrands) {
        if (brandIdMap.has(brand)) continue;
        const brandRecord = await upsertBrandByName(brand);
        brandIdMap.set(brandRecord.name, brandRecord.id);
      }

      const results = await Promise.allSettled(
        canonicalProducts.map((product) => {
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
              category: product.category,
              brand: product.brand,
              providerPrice: providerPrice,
              margin: margin,
              sellingPrice: sellingPrice,
              stock: product.stock,
              description: product.description,
              lastSyncAt: new Date(),
            },
          }).then(async (savedProduct) => {
            const brandId = brandIdMap.get(product.brand);
            if (brandId) {
              await prisma.$executeRaw`
                UPDATE products SET brandId = ${brandId} WHERE id = ${savedProduct.id}
              `;
            }
            return savedProduct;
          });
        })
      );

      const knownBrands = new Set(brandMetas.map((item) => item.brand));
      const missingBrands = Array.from(
        new Set(canonicalProducts.map((item) => item.brand).filter((brand) => !knownBrands.has(brand)))
      );
      if (missingBrands.length > 0) {
        await prisma.brandMeta.createMany({
          data: missingBrands.map((brand) => ({ brand })),
          skipDuplicates: true,
        });
      }

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      return { succeeded, failed, total: canonicalProducts.length };
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
