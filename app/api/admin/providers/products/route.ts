import { NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/providers/products
 * Get products from DATABASE only (no external API calls)
 */
export async function GET() {
  try {
    const allProducts = await prisma.product.findMany({
      orderBy: [
        { provider: "asc" },
        { isActive: "desc" },
        { category: "asc" },
        { sellingPrice: "asc" },
      ],
    });

    // Group by provider
    const productsData: Record<string, any[]> = {};
    
    allProducts.forEach((product) => {
      if (!productsData[product.provider]) {
        productsData[product.provider] = [];
      }
      
      productsData[product.provider].push({
        code: product.providerCode,
        name: product.name,
        category: product.category,
        brand: product.brand,
        type: product.type,
        providerPrice: Number(product.providerPrice),
        margin: Number(product.margin),
        sellingPrice: Number(product.sellingPrice),
        stock: product.stock,
        isActive: product.isActive,
        description: product.description,
      });
    });

    return NextResponse.json({
      success: true,
      data: productsData,
      summary: {
        totalProviders: Object.keys(productsData).length,
        totalProducts: allProducts.length,
      },
    });
  } catch (error) {
    console.error("Failed to get products from database:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get provider products",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
