/**
 * Seed default UserTier rows.
 * Run: npx ts-node --project tsconfig.json prisma/seed-tiers.ts
 * Or use the npm script: npm run seed:tiers
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_TIERS = [
  {
    name: "member",
    label: "Member",
    description: "Pengguna biasa — harga normal",
    marginMultiplier: 1.0,
    minOrders: 0,
    isDefault: true,
    sortOrder: 0,
  },
  {
    name: "reseller",
    label: "Reseller",
    description: "Penjual kecil — diskon 20% dari margin",
    marginMultiplier: 0.8,
    minOrders: 50,
    isDefault: false,
    sortOrder: 1,
  },
  {
    name: "agent",
    label: "Agent",
    description: "Penjual besar — diskon 40% dari margin",
    marginMultiplier: 0.6,
    minOrders: 200,
    isDefault: false,
    sortOrder: 2,
  },
];

async function main() {
  console.log("Seeding user tiers...");
  for (const tier of DEFAULT_TIERS) {
    await prisma.userTier.upsert({
      where: { name: tier.name },
      update: {
        label: tier.label,
        description: tier.description,
        marginMultiplier: tier.marginMultiplier,
        minOrders: tier.minOrders,
        isDefault: tier.isDefault,
        sortOrder: tier.sortOrder,
      },
      create: tier,
    });
    console.log(`  ✓ ${tier.label} (marginMultiplier: ${tier.marginMultiplier})`);
  }
  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
