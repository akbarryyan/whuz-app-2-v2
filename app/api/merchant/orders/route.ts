import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";
import { requireSellerSession } from "@/lib/seller";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const merchant = await requireSellerSession();
  if ("error" in merchant) {
    return NextResponse.json({ success: false, error: merchant.error }, { status: merchant.status });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "10")));
  const status = searchParams.get("status")?.trim() ?? "";
  const q = searchParams.get("q")?.trim() ?? "";
  const mode = searchParams.get("mode")?.trim() ?? "all";
  const dateFrom = searchParams.get("dateFrom")?.trim() ?? "";
  const dateTo = searchParams.get("dateTo")?.trim() ?? "";
  const format = searchParams.get("format")?.trim() ?? "";
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const createdAtFilter: { gte?: Date; lte?: Date } = {};
  if (mode === "today") {
    createdAtFilter.gte = startOfDay;
  }
  if (dateFrom) {
    createdAtFilter.gte = new Date(`${dateFrom}T00:00:00`);
  }
  if (dateTo) {
    createdAtFilter.lte = new Date(`${dateTo}T23:59:59.999`);
  }

  const where = {
    sellerId: merchant.session.userId!,
    ...(status ? { status } : {}),
    ...(Object.keys(createdAtFilter).length > 0 ? { createdAt: createdAtFilter } : {}),
    ...(q
      ? {
          OR: [
            { orderCode: { contains: q } },
            { targetNumber: { contains: q } },
            { product: { name: { contains: q } } },
            { product: { brand: { contains: q } } },
            { user: { name: { contains: q } } },
            { user: { email: { contains: q } } },
            { user: { phone: { contains: q } } },
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...(format === "csv"
        ? {}
        : {
            skip: (page - 1) * limit,
            take: limit,
          }),
      include: {
        product: {
          select: { id: true, name: true, brand: true, category: true },
        },
        paymentInvoice: {
          select: { status: true, method: true, paidAt: true },
        },
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  if (format === "csv") {
    const escapeCsv = (value: string | number | null | undefined) => {
      const stringValue = String(value ?? "");
      if (stringValue.includes(",") || stringValue.includes("\"") || stringValue.includes("\n")) {
        return `"${stringValue.replace(/"/g, "\"\"")}"`;
      }
      return stringValue;
    };

    const lines = [
      [
        "Order ID",
        "Status",
        "Produk",
        "Brand",
        "Pelanggan",
        "Target",
        "Metode Bayar",
        "Provider",
        "Total",
        "Komisi",
        "Fee",
        "Gross Profit",
        "Dibuat",
      ].join(","),
      ...orders.map((order) =>
        [
          order.orderCode,
          order.status,
          order.product.name,
          order.product.brand,
          order.user?.name || order.user?.email || order.user?.phone || "Guest",
          order.targetNumber,
          order.paymentMethod,
          order.provider || "",
          Number(order.amount),
          Number(order.sellerCommission),
          Number(order.sellerFeeAmount),
          Number(order.sellerGrossProfit),
          order.createdAt.toISOString(),
        ]
          .map(escapeCsv)
          .join(",")
      ),
    ];

    return new NextResponse(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="merchant-orders-${merchant.session.userId}.csv"`,
      },
    });
  }

  return NextResponse.json({
    success: true,
    data: orders.map((order) => ({
      id: order.id,
      orderCode: order.orderCode,
      status: order.status,
      amount: Number(order.amount),
      sellerGrossProfit: Number(order.sellerGrossProfit),
      sellerFeeAmount: Number(order.sellerFeeAmount),
      sellerCommission: Number(order.sellerCommission),
      paymentMethod: order.paymentMethod,
      targetNumber: order.targetNumber,
      provider: order.provider,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      retryAllowed:
        order.status === "FAILED" &&
        order.paymentMethod === "PAYMENT_GATEWAY" &&
        order.paymentInvoice?.status === "PAID",
      product: order.product,
      customer: order.user,
      paymentInvoice: order.paymentInvoice,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
