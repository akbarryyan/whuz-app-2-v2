import { NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sellers = await prisma.sellerProfile.findMany({
      where: { isActive: true },
      select: {
        id: true,
        slug: true,
        displayName: true,
        description: true,
        profileImageUrl: true,
        userId: true,
      },
      orderBy: { displayName: "asc" },
    });

    const sellerIds = sellers.map((seller) => seller.userId);
    const sellerProducts = await prisma.sellerProduct.findMany({
      where: {
        sellerId: { in: sellerIds },
        isActive: true,
        product: {
          isActive: true,
          stock: true,
        },
      },
      select: {
        sellerId: true,
        product: {
          select: {
            brand: true,
          },
        },
      },
    });

    const grouped = new Map<string, { productCount: number; brands: Set<string> }>();
    for (const item of sellerProducts) {
      if (!grouped.has(item.sellerId)) {
        grouped.set(item.sellerId, { productCount: 0, brands: new Set<string>() });
      }
      const bucket = grouped.get(item.sellerId)!;
      bucket.productCount += 1;
      bucket.brands.add(item.product.brand);
    }

    const data = sellers
      .map((seller) => {
        const stats = grouped.get(seller.userId);
        return {
          id: seller.id,
          slug: seller.slug,
          displayName: seller.displayName,
          description: seller.description,
          profileImageUrl: seller.profileImageUrl,
          productCount: stats?.productCount ?? 0,
          brandCount: stats?.brands.size ?? 0,
        };
      })
      .filter((seller) => seller.productCount > 0);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[CATALOG SELLERS ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat merchant." },
      { status: 500 }
    );
  }
}
