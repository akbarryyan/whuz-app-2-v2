import { NextResponse } from "next/server";
import { ProviderManagementService } from "@/src/core/services/provider/provider-management.service";
import { ProviderType } from "@/src/core/domain/enums/provider.enum";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/providers/[type]/products
 * Get products from specific provider
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const providerType = type.toUpperCase() as ProviderType;

    // Validate provider type
    if (!Object.values(ProviderType).includes(providerType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid provider type",
          validTypes: Object.values(ProviderType),
        },
        { status: 400 }
      );
    }

    const service = new ProviderManagementService();
    const products = await service.getProviderProducts(providerType);

    return NextResponse.json({
      success: true,
      data: {
        provider: providerType,
        products: products.map((product) => ({
          code: product.providerCode,
          name: product.providerName,
          category: product.category,
          brand: product.brand,
          type: product.type,
          price: product.price,
          stock: product.stock,
          description: product.description,
        })),
        total: products.length,
      },
    });
  } catch (error) {
    console.error(`Failed to get products from provider:`, error);
    
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get products",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
