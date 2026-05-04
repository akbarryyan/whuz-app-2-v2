import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

interface DigitalStockRow {
  id: string;
  productId: string;
  orderId: string | null;
  label: string | null;
  credentialEmail: string | null;
  credentialPassword: string | null;
  credentialData: Prisma.JsonValue | null;
  notes: string | null;
  status: string;
  soldAt: Date | null;
  createdAt: Date;
  orderCode: string | null;
}

type DigitalStockInput = {
  label?: string | null;
  credentialEmail?: string | null;
  email?: string | null;
  credentialPassword?: string | null;
  password?: string | null;
  notes?: string | null;
};

function stockToJson(stock: DigitalStockRow) {
  return {
    id: stock.id,
    productId: stock.productId,
    orderId: stock.orderId,
    orderCode: stock.orderCode,
    label: stock.label,
    credentialEmail: stock.credentialEmail,
    credentialPassword: stock.credentialPassword,
    credentialData: stock.credentialData,
    notes: stock.notes,
    status: stock.status,
    soldAt: stock.soldAt?.toISOString() ?? null,
    createdAt: stock.createdAt.toISOString(),
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const rows = await prisma.$queryRaw<DigitalStockRow[]>`
      SELECT
        dps.id,
        dps.productId,
        dps.orderId,
        dps.label,
        dps.credentialEmail,
        dps.credentialPassword,
        dps.credentialData,
        dps.notes,
        dps.status,
        dps.soldAt,
        dps.createdAt,
        o.orderCode
      FROM digital_product_stocks dps
      LEFT JOIN orders o ON o.id = dps.orderId
      WHERE dps.productId = ${id}
      ORDER BY
        FIELD(dps.status, 'AVAILABLE', 'SOLD', 'DISABLED'),
        dps.createdAt DESC
    `;

    return NextResponse.json({
      success: true,
      data: rows.map(stockToJson),
      meta: {
        available: rows.filter((row) => row.status === "AVAILABLE").length,
        sold: rows.filter((row) => row.status === "SOLD").length,
        disabled: rows.filter((row) => row.status === "DISABLED").length,
      },
    });
  } catch (error) {
    console.error("[ADMIN DIGITAL STOCK GET ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat stok digital." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await context.params;

    const body: { items?: DigitalStockInput[] } & DigitalStockInput =
      await request.json();

    const items: DigitalStockInput[] = Array.isArray(body.items)
      ? body.items
      : [body];

    const cleanItems = items
      .map((item) => ({
        id: crypto.randomUUID(),
        label: String(item.label ?? "").trim() || null,
        credentialEmail:
          String(item.credentialEmail ?? item.email ?? "").trim() || null,
        credentialPassword:
          String(item.credentialPassword ?? item.password ?? "").trim() || null,
        notes: String(item.notes ?? "").trim() || null,
      }))
      .filter(
        (item) =>
          item.credentialEmail || item.credentialPassword || item.notes
      );

    if (cleanItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Minimal isi email, password, atau catatan stok.",
        },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, provider: true, type: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Produk tidak ditemukan." },
        { status: 404 }
      );
    }

    if (product.provider !== "MANUAL") {
      return NextResponse.json(
        {
          success: false,
          error: "Stok digital hanya untuk produk manual.",
        },
        { status: 400 }
      );
    }

    await prisma.product.update({
      where: { id: productId },
      data: { type: "digital_stock", stock: true },
    });

    await prisma.$transaction(
      cleanItems.map((item) =>
        prisma.$executeRaw`
          INSERT INTO digital_product_stocks (
            id, productId, label, credentialEmail, credentialPassword, notes, status, createdAt, updatedAt
          )
          VALUES (
            ${item.id}, ${productId}, ${item.label}, ${item.credentialEmail}, ${item.credentialPassword}, ${item.notes}, 'AVAILABLE', NOW(3), NOW(3)
          )
        `
      )
    );

    return NextResponse.json(
      { success: true, created: cleanItems.length },
      { status: 201 }
    );
  } catch (error) {
    console.error("[ADMIN DIGITAL STOCK POST ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Gagal menambah stok digital." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await context.params;
    const body = await request.json();

    const id = String(body.id ?? "").trim();
    const status = String(body.status ?? "AVAILABLE")
      .trim()
      .toUpperCase();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID stok wajib diisi." },
        { status: 400 }
      );
    }

    if (!["AVAILABLE", "DISABLED"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Status hanya bisa AVAILABLE atau DISABLED.",
        },
        { status: 400 }
      );
    }

    await prisma.$executeRaw`
      UPDATE digital_product_stocks
      SET label = ${String(body.label ?? "").trim() || null},
          credentialEmail = ${String(body.credentialEmail ?? "").trim() || null},
          credentialPassword = ${String(body.credentialPassword ?? "").trim() || null},
          notes = ${String(body.notes ?? "").trim() || null},
          status = ${status},
          updatedAt = NOW(3)
      WHERE id = ${id}
        AND productId = ${productId}
        AND orderId IS NULL
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN DIGITAL STOCK PUT ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Gagal update stok digital." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await context.params;
    const body = await request.json();

    const id = String(body.id ?? "").trim();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID stok wajib diisi." },
        { status: 400 }
      );
    }

    await prisma.$executeRaw`
      DELETE FROM digital_product_stocks
      WHERE id = ${id}
        AND productId = ${productId}
        AND orderId IS NULL
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN DIGITAL STOCK DELETE ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Gagal hapus stok digital." },
      { status: 500 }
    );
  }
}