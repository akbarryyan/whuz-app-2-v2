/**
 * Voucher Seeder
 * Run: npx ts-node --project tsconfig.json prisma/seed-vouchers.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding vouchers...");

  const vouchers = [
    {
      code: "WELCOME10",
      title: "Welcome 10% Off",
      description: "Diskon 10% untuk pengguna baru. Maksimal diskon Rp 10.000. Minimum pembelian Rp 20.000.",
      discountType: "PERCENT" as const,
      discountValue: 10,
      maxDiscount: 10000,
      minPurchase: 20000,
      quota: null,
      perUserLimit: 1,
      isActive: true,
    },
    {
      code: "HEMAT5K",
      title: "Hemat 5 Ribu",
      description: "Potongan langsung Rp 5.000 untuk semua transaksi. Minimum pembelian Rp 15.000.",
      discountType: "FIXED" as const,
      discountValue: 5000,
      maxDiscount: null,
      minPurchase: 15000,
      quota: 100,
      perUserLimit: 1,
      isActive: true,
    },
    {
      code: "NEWUSER20",
      title: "New User 20% Disc",
      description: "Nikmati diskon 20% untuk transaksi pertamamu! Quota terbatas 50 pengguna.",
      discountType: "PERCENT" as const,
      discountValue: 20,
      maxDiscount: 20000,
      minPurchase: 10000,
      quota: 50,
      perUserLimit: 1,
      isActive: true,
    },
    {
      code: "TOPUP15",
      title: "Top-Up 15% Off",
      description: "Diskon 15% untuk top-up game dan pulsa. Berlaku sampai akhir bulan.",
      discountType: "PERCENT" as const,
      discountValue: 15,
      maxDiscount: 15000,
      minPurchase: 25000,
      quota: 200,
      perUserLimit: 2,
      isActive: true,
      endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), // end of current month
    },
    {
      code: "GRATIS3K",
      title: "Gratis 3 Ribu",
      description: "Potongan Rp 3.000 tanpa minimum pembelian. Cocok untuk semua produk.",
      discountType: "FIXED" as const,
      discountValue: 3000,
      maxDiscount: null,
      minPurchase: 0,
      quota: null,
      perUserLimit: 3,
      isActive: true,
    },
    {
      code: "FLASHSALE50",
      title: "Flash Sale 50% Off",
      description: "Diskon spesial 50% maksimal Rp 25.000. Flash sale — quota sangat terbatas!",
      discountType: "PERCENT" as const,
      discountValue: 50,
      maxDiscount: 25000,
      minPurchase: 20000,
      quota: 20,
      perUserLimit: 1,
      isActive: false, // disabled by default (admin can activate for events)
    },
  ];

  let created = 0;
  let updated = 0;

  for (const v of vouchers) {
    const { endDate, ...rest } = v as typeof v & { endDate?: Date };
    const result = await prisma.voucher.upsert({
      where: { code: v.code },
      update: {
        title: v.title,
        description: v.description,
        discountType: v.discountType,
        discountValue: v.discountValue,
        maxDiscount: v.maxDiscount,
        minPurchase: v.minPurchase,
        isActive: v.isActive,
        ...(endDate ? { endDate } : {}),
      },
      create: {
        code: v.code,
        title: v.title,
        description: v.description,
        discountType: v.discountType,
        discountValue: v.discountValue,
        maxDiscount: v.maxDiscount,
        minPurchase: v.minPurchase,
        quota: v.quota,
        perUserLimit: v.perUserLimit,
        usedCount: 0,
        isActive: v.isActive,
        ...(endDate ? { endDate } : {}),
      },
    });
    console.log(`  ${result.code} — ${result.title}`);
    created++;
  }

  console.log(`\n✅ Done! ${created} vouchers seeded.`);
}

main()
  .catch((e) => {
    console.error("❌ Seeder error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
