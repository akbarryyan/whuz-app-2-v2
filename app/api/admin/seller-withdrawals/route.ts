import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status")?.trim() ?? "";

  const items = await prisma.sellerWithdrawalRequest.findMany({
    where: status ? { status } : undefined,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          sellerProfile: {
            select: { slug: true, displayName: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: items.map((item) => ({
      ...item,
      amount: Number(item.amount),
    })),
  });
}
