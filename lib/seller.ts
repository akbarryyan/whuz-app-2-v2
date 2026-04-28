import { prisma } from "@/src/infra/db/prisma";
import { getSession } from "@/lib/session";

export async function requireSellerSession() {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.userId },
  });

  if (!sellerProfile || !sellerProfile.isActive) {
    return { error: "Seller profile not found or inactive", status: 403 as const };
  }

  return {
    session,
    sellerProfile,
  };
}

export function slugifySellerName(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
