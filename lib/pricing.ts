/**
 * lib/pricing.ts
 *
 * Centralized pricing logic for role-based pricing.
 *
 * Formula:
 *   effectiveMarkup = product.margin * tier.marginMultiplier
 *   sellingPrice    = product.providerPrice + effectiveMarkup
 *
 * - Member   (multiplier 1.00) → pays full margin (default price)
 * - Reseller (multiplier 0.80) → pays 80% of margin (20% cheaper)
 * - Agent    (multiplier 0.60) → pays 60% of margin (40% cheaper)
 *
 * Auto-upgrade: after each order SUCCESS, call checkAndUpgradeUserTier(userId).
 * The system finds the highest tier where minOrders > 0 && user.successOrders >= minOrders,
 * and upgrades the user if their current tier is lower.
 */

import { prisma } from "@/src/infra/db/prisma";

export interface TierPricing {
  tierId: string;
  tierName: string;
  tierLabel: string;
  marginMultiplier: number;
  basePrice: number;       // providerPrice (cost from provider)
  markup: number;          // effective markup after applying multiplier
  sellingPrice: number;    // final price for customer
}

/**
 * Fetch the effective UserTier for a given userId.
 * Falls back to the isDefault tier if user has no tier assigned.
 * Returns null if no tier found at all (should not happen after seed).
 */
export async function getTierForUser(userId: string | null | undefined) {
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tier: true },
    });
    if (user?.tier) return user.tier;
  }

  // Fallback: default tier (Member)
  const defaultTier = await prisma.userTier.findFirst({
    where: { isDefault: true },
    orderBy: { sortOrder: "asc" },
  });

  return defaultTier;
}

/**
 * Calculate the tier-adjusted price for a product.
 */
export function calcTierPrice(
  providerPrice: number,
  margin: number,
  marginMultiplier: number
): { markup: number; sellingPrice: number } {
  const markup = Math.round(margin * marginMultiplier);
  return { markup, sellingPrice: providerPrice + markup };
}

/**
 * Convenience: get full pricing breakdown for a user + product combo.
 */
export async function getPriceForUser(
  userId: string | null | undefined,
  product: { id: string; providerPrice: unknown; margin: unknown }
): Promise<TierPricing | null> {
  const tier = await getTierForUser(userId);
  if (!tier) return null;

  const providerPrice = Number(product.providerPrice);
  const margin = Number(product.margin);
  const multiplier = Number(tier.marginMultiplier);

  const { markup, sellingPrice } = calcTierPrice(providerPrice, margin, multiplier);

  return {
    tierId: tier.id,
    tierName: tier.name,
    tierLabel: tier.label,
    marginMultiplier: multiplier,
    basePrice: providerPrice,
    markup,
    sellingPrice,
  };
}

/**
 * Auto-upgrade user tier based on total successful orders.
 * Called after every order SUCCESS.
 *
 * Logic:
 * - Fetch all tiers with minOrders > 0, sorted by minOrders DESC (highest first)
 * - Count user's total SUCCESS orders
 * - Find the highest tier the user qualifies for
 * - If that tier is "better" (lower marginMultiplier) than current, upgrade
 *
 * Safe to call multiple times — idempotent.
 */
export async function checkAndUpgradeUserTier(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tier: true },
    });
    if (!user) return;

    // Count total success orders for this user
    const successCount = await prisma.order.count({
      where: { userId, status: "SUCCESS" },
    });

    // Get all tiers with auto-upgrade thresholds (minOrders > 0), best deal first
    const upgradeTiers = await prisma.userTier.findMany({
      where: { minOrders: { gt: 0 } },
      orderBy: { minOrders: "desc" }, // highest threshold = best deal = evaluate first
    });

    // Find the best tier the user qualifies for
    const qualifiedTier = upgradeTiers.find((t) => successCount >= t.minOrders);
    if (!qualifiedTier) return;

    const currentMultiplier = user.tier ? Number(user.tier.marginMultiplier) : 1.0;
    const qualifiedMultiplier = Number(qualifiedTier.marginMultiplier);

    // Only upgrade — never downgrade
    if (qualifiedMultiplier < currentMultiplier) {
      await prisma.user.update({
        where: { id: userId },
        data: { tierId: qualifiedTier.id },
      });
      console.log(
        `[UserTier] User ${userId} auto-upgraded to "${qualifiedTier.label}" ` +
        `(${successCount} success orders >= ${qualifiedTier.minOrders} threshold)`
      );
    }
  } catch (err) {
    // Non-fatal: log but don't fail the order
    console.error("[UserTier] checkAndUpgradeUserTier error:", err);
  }
}
