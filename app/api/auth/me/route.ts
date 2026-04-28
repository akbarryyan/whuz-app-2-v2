import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/src/infra/db/prisma";

export async function GET() {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ isLoggedIn: false, user: null });
    }

    // Ambil data user + wallet + stats transaksi secara paralel
    const [user, wallet, totalOrders, successOrders] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          tier: {
            select: {
              id: true,
              name: true,
              label: true,
              minOrders: true,
              sortOrder: true,
              marginMultiplier: true,
              isDefault: true,
            },
          },
          sellerProfile: {
            select: {
              id: true,
              slug: true,
              displayName: true,
              isActive: true,
            },
          },
        },
      }),
      prisma.wallet.findUnique({
        where: { userId: session.userId },
        select: { balance: true },
      }),
      prisma.order.count({
        where: { userId: session.userId },
      }),
      prisma.order.count({
        where: { userId: session.userId, status: "SUCCESS" },
      }),
    ]);

    if (!user || !user.isActive) {
      return NextResponse.json({ isLoggedIn: false, user: null });
    }

    // Resolve effective tier (user's tier or fallback to default)
    let currentTier = user.tier;
    if (!currentTier) {
      currentTier = await prisma.userTier.findFirst({
        where: { isDefault: true },
        select: {
          id: true,
          name: true,
          label: true,
          minOrders: true,
          sortOrder: true,
          marginMultiplier: true,
          isDefault: true,
        },
        orderBy: { sortOrder: "asc" },
      });
    }

    // Find next tier (higher sortOrder, has an auto-upgrade threshold)
    const nextTier = currentTier
      ? await prisma.userTier.findFirst({
          where: {
            sortOrder: { gt: currentTier.sortOrder },
            minOrders: { gt: 0 },
          },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            label: true,
            minOrders: true,
            sortOrder: true,
            marginMultiplier: true,
          },
        })
      : null;

    return NextResponse.json({
      isLoggedIn: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
      },
      seller: user.sellerProfile
        ? {
            id: user.sellerProfile.id,
            slug: user.sellerProfile.slug,
            displayName: user.sellerProfile.displayName,
            isActive: user.sellerProfile.isActive,
          }
        : null,
      wallet: {
        balance: wallet ? Number(wallet.balance) : 0,
      },
      stats: {
        totalOrders,
        successOrders,
      },
      tier: currentTier
        ? {
            id: currentTier.id,
            name: currentTier.name,
            label: currentTier.label,
            minOrders: currentTier.minOrders,
            marginMultiplier: Number(currentTier.marginMultiplier),
          }
        : null,
      nextTier: nextTier
        ? {
            id: nextTier.id,
            name: nextTier.name,
            label: nextTier.label,
            minOrders: nextTier.minOrders,
            marginMultiplier: Number(nextTier.marginMultiplier),
          }
        : null,
    });
  } catch (error) {
    console.error("[AUTH ME ERROR]", error);
    return NextResponse.json({ isLoggedIn: false, user: null });
  }
}
