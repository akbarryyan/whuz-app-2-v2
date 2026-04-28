/**
 * GET  /api/admin/flash-sale  — returns current flash sale config
 * PUT  /api/admin/flash-sale  — replaces entire flash sale config
 * DELETE /api/admin/flash-sale — resets to default (inactive, empty)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getFlashSaleConfig,
  setFlashSaleConfig,
  type FlashSaleConfig,
} from "@/lib/site-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getFlashSaleConfig();
  return NextResponse.json({ success: true, data: config });
}

const ProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().default(""),
  brandImage: z.string().default(""),
  badge: z.string().default(""),
  discount: z.string().default(""),
  originalPrice: z.string().default(""),
  price: z.string(),
});

const PutSchema = z.object({
  isActive: z.boolean(),
  endTime: z.string().datetime({ message: "endTime harus format ISO datetime" }),
  products: z.array(ProductSchema),
});

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation error", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  await setFlashSaleConfig(parsed.data as FlashSaleConfig);
  return NextResponse.json({ success: true, data: parsed.data });
}

export async function DELETE() {
  const defaultCfg: FlashSaleConfig = {
    isActive: false,
    endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    products: [],
  };
  await setFlashSaleConfig(defaultCfg);
  return NextResponse.json({ success: true, data: defaultCfg });
}
