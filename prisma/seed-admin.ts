/**
 * Seed admin user.
 * Run: npx ts-node --project tsconfig.json prisma/seed-admin.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@whuzpay.com";
const ADMIN_PASSWORD = "admin123";
const ADMIN_NAME = "Admin Whuzpay";

async function main() {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: "ADMIN", passwordHash: hash, name: ADMIN_NAME, isActive: true },
    create: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      passwordHash: hash,
      role: "ADMIN",
      isActive: true,
    },
  });

  // Ensure wallet exists
  await prisma.wallet.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, balance: 0 },
  });

  console.log("✅ Admin user seeded:");
  console.log(`   Email    : ${ADMIN_EMAIL}`);
  console.log(`   Password : ${ADMIN_PASSWORD}`);
  console.log(`   Name     : ${ADMIN_NAME}`);
  console.log(`   ID       : ${user.id}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
