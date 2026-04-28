import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/src/infra/db/prisma";

/**
 * GET  /api/tickets         — list user's tickets
 * POST /api/tickets         — create new ticket (with first message)
 */
export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const tickets = await prisma.ticket.findMany({
    where: { userId: session.userId },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Count unread = tickets where last message is from ADMIN
  const unreadCount = tickets.filter(
    (t) => t.status !== "CLOSED" && t.messages[0]?.senderRole === "ADMIN"
  ).length;

  return NextResponse.json({
    success: true,
    data: tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      lastMessage: t.messages[0]?.body ?? "",
      lastSender: t.messages[0]?.senderRole ?? "",
      messageCount: t._count.messages,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    unreadCount,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { subject, message } = await req.json();
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ success: false, error: "Subject and message required" }, { status: 400 });
  }

  const ticket = await prisma.ticket.create({
    data: {
      userId: session.userId,
      subject: subject.trim(),
      messages: {
        create: {
          senderRole: "USER",
          senderId: session.userId,
          body: message.trim(),
        },
      },
    },
    include: { messages: true },
  });

  return NextResponse.json({ success: true, data: ticket }, { status: 201 });
}
