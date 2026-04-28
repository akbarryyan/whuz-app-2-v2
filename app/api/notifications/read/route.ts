import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/src/infra/db/prisma";

/**
 * PATCH /api/notifications/read — mark notifications as read
 * Body: { ids: string[] } or { all: true }
 */
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  const body = await req.json();

  // Build OR conditions: broadcast + user-specific
  const orConditions: Array<Record<string, unknown>> = [
    { userId: null },
  ];
  if (session.isLoggedIn && session.userId) {
    orConditions.push({ userId: session.userId });
  }

  if (body.all) {
    await prisma.notification.updateMany({
      where: { OR: orConditions, isRead: false },
      data: { isRead: true },
    });
  } else if (Array.isArray(body.ids) && body.ids.length > 0) {
    await prisma.notification.updateMany({
      where: {
        id: { in: body.ids },
        OR: orConditions,
      },
      data: { isRead: true },
    });
  }

  return NextResponse.json({ success: true });
}
