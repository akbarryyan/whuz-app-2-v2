import { NextResponse } from "next/server";
import { ProviderManagementService } from "@/src/core/services/provider/provider-management.service";
import { ProviderType } from "@/src/core/domain/enums/provider.enum";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/providers/test
 * Test provider connection and operations
 * 
 * Request body:
 * {
 *   "provider": "DIGIFLAZZ" | "VIP_RESELLER",
 *   "operations": ["checkBalance", "getProducts", "healthCheck"]
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { provider, operations = ["checkBalance", "healthCheck"] } = body;

    if (!provider || !Object.values(ProviderType).includes(provider)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid provider",
          validProviders: Object.values(ProviderType),
        },
        { status: 400 }
      );
    }

    const service = new ProviderManagementService();
    const results: Record<string, any> = {};

    // Test check balance
    if (operations.includes("checkBalance")) {
      try {
        const info = await service.getProviderInfo(provider);
        results.checkBalance = {
          success: true,
          data: {
            balance: info.balance.balance,
            currency: info.balance.currency,
            lastUpdated: info.balance.lastUpdated,
          },
        };
      } catch (error) {
        results.checkBalance = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    // Test get products
    if (operations.includes("getProducts")) {
      try {
        const products = await service.getProviderProducts(provider);
        results.getProducts = {
          success: true,
          data: {
            count: products.length,
            sample: products.slice(0, 5).map((p) => ({
              code: p.providerCode,
              name: p.providerName,
              category: p.category,
              price: p.price,
              stock: p.stock,
            })),
          },
        };
      } catch (error) {
        results.getProducts = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    // Test health check
    if (operations.includes("healthCheck")) {
      try {
        const health = await service.testProviderConnection(provider);
        results.healthCheck = {
          success: true,
          data: {
            status: health.status,
            latency: health.latency,
            lastCheck: health.lastCheck,
          },
        };
      } catch (error) {
        results.healthCheck = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    return NextResponse.json({
      success: true,
      provider,
      mode: process.env[`PROVIDER_${provider}_MODE`] || "mock",
      results,
    });
  } catch (error) {
    console.error("Failed to test provider:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "Failed to test provider",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
