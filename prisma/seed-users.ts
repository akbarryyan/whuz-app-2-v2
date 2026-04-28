import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_USERS = [
  {
    email: "member1@whuzpay.com",
    phone: "081234567801",
    name: "Member Demo 1",
    password: "member123",
    role: "MEMBER",
    walletBalance: 125000,
    tierName: "member",
  },
  {
    email: "member2@whuzpay.com",
    phone: "081234567802",
    name: "Member Demo 2",
    password: "member123",
    role: "MEMBER",
    walletBalance: 90000,
    tierName: "member",
  },
  {
    email: "merchant1@whuzpay.com",
    phone: "081234567803",
    name: "Merchant Demo 1",
    password: "merchant123",
    role: "MEMBER",
    walletBalance: 275000,
    tierName: "reseller",
    sellerProfile: {
      slug: "merchant-demo-1",
      displayName: "Merchant Demo 1",
      description: "Toko demo merchant untuk testing storefront, pricing, dan transaksi merchant.",
    },
  },
  {
    email: "merchant2@whuzpay.com",
    phone: "081234567804",
    name: "Merchant Demo 2",
    password: "merchant123",
    role: "MEMBER",
    walletBalance: 180000,
    tierName: "reseller",
    sellerProfile: {
      slug: "merchant-demo-2",
      displayName: "Merchant Demo 2",
      description: "Merchant demo kedua untuk kebutuhan presentasi client dan uji katalog seller.",
    },
  },
];

async function main() {
  console.log("Seeding demo users...");

  const tiers = await prisma.userTier.findMany({
    select: { id: true, name: true },
  });
  const tierMap = new Map(tiers.map((tier) => [tier.name, tier.id]));

  for (const item of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(item.password, 10);
    const tierId = tierMap.get(item.tierName) ?? null;

    const user = await prisma.user.upsert({
      where: { email: item.email },
      update: {
        name: item.name,
        phone: item.phone,
        passwordHash,
        role: item.role,
        tierId,
        isActive: true,
      },
      create: {
        email: item.email,
        phone: item.phone,
        name: item.name,
        passwordHash,
        role: item.role,
        tierId,
        isActive: true,
      },
    });

    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: { balance: item.walletBalance },
      create: {
        userId: user.id,
        balance: item.walletBalance,
      },
    });

    if (item.sellerProfile) {
      await prisma.sellerProfile.upsert({
        where: { userId: user.id },
        update: {
          slug: item.sellerProfile.slug,
          displayName: item.sellerProfile.displayName,
          description: item.sellerProfile.description,
          isActive: true,
        },
        create: {
          userId: user.id,
          slug: item.sellerProfile.slug,
          displayName: item.sellerProfile.displayName,
          description: item.sellerProfile.description,
          isActive: true,
        },
      });
    }

    console.log(`  ✓ ${item.email} (${item.sellerProfile ? "merchant" : "member"})`);
  }

  console.log("\nDemo credentials:");
  for (const item of DEMO_USERS) {
    console.log(`  - ${item.email} / ${item.password}`);
  }
}

main()
  .catch((error) => {
    console.error("❌ Seed users failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
