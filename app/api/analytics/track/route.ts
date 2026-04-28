import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";
import { getJakartaDayKey } from "@/lib/analytics";

export const dynamic = "force-dynamic";

function shouldIgnorePath(pathname: string) {
  return (
    !pathname ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/maintenance")
  );
}

export async function POST(request: NextRequest) {
  const today = getJakartaDayKey();
  const body = await request.json().catch(() => ({}));
  const pathname = typeof body?.pathname === "string" ? body.pathname : "/";

  if (shouldIgnorePath(pathname)) {
    return NextResponse.json({ success: true, ignored: true });
  }

  const currentVisitorId = request.cookies.get("site_visitor_id")?.value ?? "";
  const lastVisitDay = request.cookies.get("site_last_visit_day")?.value ?? "";
  const visitorId = currentVisitorId || randomUUID();
  const isNewVisitor = !currentVisitorId;
  const isNewToday = lastVisitDay !== today;
  const safePathname = pathname.slice(0, 255);

  try {
    await prisma.$transaction(async (tx) => {
      if (isNewVisitor) {
        await tx.$executeRaw`
          INSERT INTO site_visitors (id, visitorId, firstSeenAt, lastSeenAt, lastPath)
          VALUES (${randomUUID()}, ${visitorId}, NOW(3), NOW(3), ${safePathname})
        `;
      } else {
        await tx.$executeRaw`
          INSERT INTO site_visitors (id, visitorId, firstSeenAt, lastSeenAt, lastPath)
          VALUES (${randomUUID()}, ${visitorId}, NOW(3), NOW(3), ${safePathname})
          ON DUPLICATE KEY UPDATE
            lastPath = VALUES(lastPath),
            lastSeenAt = NOW(3)
        `;
      }

      const visitorIncrement = isNewToday ? 1 : 0;

      await tx.$executeRaw`
        INSERT INTO site_daily_metrics (date, uniqueVisitors, pageViews, updatedAt)
        VALUES (${today}, ${visitorIncrement}, 1, NOW(3))
        ON DUPLICATE KEY UPDATE
          pageViews = pageViews + 1,
          uniqueVisitors = uniqueVisitors + ${visitorIncrement},
          updatedAt = NOW(3)
      `;
    });
  } catch (error) {
    console.error("[POST /api/analytics/track]", error);
    return NextResponse.json({ success: false, error: "Failed to track analytics" }, { status: 500 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("site_visitor_id", visitorId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  response.cookies.set("site_last_visit_day", today, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return response;
}
