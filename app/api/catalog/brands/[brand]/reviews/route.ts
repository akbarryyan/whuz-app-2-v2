import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

/**
 * GET /api/catalog/brands/[brand]/reviews
 * Returns approved reviews + aggregate stats for a brand (public, no auth).
 * Query params: page (default 1)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ brand: string }> }
) {
  try {
    const { brand: brandSlug } = await params;
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"));
    const skip = (page - 1) * PAGE_SIZE;

    const [reviews, total, aggregate] = await Promise.all([
      prisma.brandReview.findMany({
        where: { brandSlug, isApproved: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
        select: {
          id: true,
          userName: true,
          rating: true,
          comment: true,
          createdAt: true,
        },
      }),
      prisma.brandReview.count({ where: { brandSlug, isApproved: true } }),
      prisma.brandReview.aggregate({
        where: { brandSlug, isApproved: true },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    // Rating distribution (1-5)
    const dist = await prisma.brandReview.groupBy({
      by: ["rating"],
      where: { brandSlug, isApproved: true },
      _count: { rating: true },
    });
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const d of dist) distribution[d.rating] = d._count.rating;

    // Check if the current user already has a review (approved or pending)
    const session = await getSession();
    let userReview: { rating: number; comment: string; isApproved: boolean } | null = null;
    if (session.isLoggedIn && session.userId) {
      const existing = await prisma.brandReview.findUnique({
        where: { brandSlug_userId: { brandSlug, userId: session.userId } },
        select: { rating: true, comment: true, isApproved: true },
      });
      userReview = existing;
    }

    return NextResponse.json({
      success: true,
      data: reviews.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
      meta: {
        total,
        page,
        pageSize: PAGE_SIZE,
        totalPages: Math.ceil(total / PAGE_SIZE),
        avgRating: aggregate._avg.rating ? Number(aggregate._avg.rating.toFixed(1)) : 0,
        totalRatings: aggregate._count.rating,
        distribution,
      },
      userReview,
    });
  } catch (error) {
    console.error("[BRAND REVIEWS GET ERROR]", error);
    return NextResponse.json({ success: false, error: "Gagal memuat ulasan." }, { status: 500 });
  }
}

/**
 * POST /api/catalog/brands/[brand]/reviews
 * Submit a review for a brand. Requires login.
 * Body: { rating: number (1-5), comment: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ brand: string }> }
) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ success: false, error: "Login untuk memberikan ulasan." }, { status: 401 });
    }

    const { brand: brandSlug } = await params;
    const body = await req.json();
    const rating = Number(body.rating);
    const comment = String(body.comment ?? "").trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, error: "Rating harus antara 1 sampai 5." }, { status: 400 });
    }
    if (comment.length < 5) {
      return NextResponse.json({ success: false, error: "Komentar minimal 5 karakter." }, { status: 400 });
    }
    if (comment.length > 500) {
      return NextResponse.json({ success: false, error: "Komentar maksimal 500 karakter." }, { status: 400 });
    }

    // Verify brand exists
    const brandExists = await prisma.product.findFirst({
      where: { isActive: true },
      select: { brand: true },
    }).then(async () => {
      const allBrands = await prisma.product.findMany({
        where: { isActive: true, stock: true },
        select: { brand: true },
        distinct: ["brand"],
      });
      return allBrands.some((b) => {
        const slug = b.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        return slug === brandSlug;
      });
    });

    if (!brandExists) {
      return NextResponse.json({ success: false, error: "Brand tidak ditemukan." }, { status: 404 });
    }

    // Get user's display name
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, phone: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: "Pengguna tidak ditemukan." }, { status: 401 });
    }
    const displayName = user.name || user.phone || user.email || "Pengguna";

    // Upsert: one review per user per brand
    await prisma.brandReview.upsert({
      where: { brandSlug_userId: { brandSlug, userId: session.userId } },
      create: {
        brandSlug,
        userId: session.userId,
        userName: displayName,
        rating,
        comment,
        isApproved: false, // requires admin approval
      },
      update: {
        rating,
        comment,
        userName: displayName,
        isApproved: false, // re-submit resets approval
      },
    });

    return NextResponse.json({
      success: true,
      message: "Ulasan berhasil dikirim dan menunggu persetujuan admin.",
    });
  } catch (error) {
    console.error("[BRAND REVIEWS POST ERROR]", error);
    return NextResponse.json({ success: false, error: "Gagal mengirim ulasan." }, { status: 500 });
  }
}
