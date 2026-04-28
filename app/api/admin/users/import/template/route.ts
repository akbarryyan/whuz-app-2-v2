import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

async function ensureAdmin() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId || session.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await ensureAdmin();
  if (!session) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const rows = [
    {
      name: "Member Contoh",
      email: "member.contoh@example.com",
      phone: "081234567890",
      password: "Member123",
      tier: "Member",
      is_active: "true",
      role: "member",
      merchant_name: "",
      merchant_slug: "",
      merchant_description: "",
      merchant_is_active: "",
    },
    {
      name: "Merchant Contoh",
      email: "merchant.contoh@example.com",
      phone: "081234567891",
      password: "Merchant123",
      tier: "Reseller",
      is_active: "true",
      role: "merchant",
      merchant_name: "Toko Contoh",
      merchant_slug: "toko-contoh",
      merchant_description: "Merchant contoh hasil import excel",
      merchant_is_active: "true",
    },
  ];

  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "members");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-import-member-merchant.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
