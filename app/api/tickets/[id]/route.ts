import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/src/infra/db/prisma";

interface Params { params: Promise<{ id: string }> }

/**
 * GET  /api/tickets/[id]          — get ticket detail with messages
 * POST /api/tickets/[id]          — add message to ticket (user reply)
 * PATCH /api/tickets/[id]         — close ticket
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const ticket = await prisma.ticket.findFirst({
    where: { id, userId: session.userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!ticket) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: ticket });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const ticket = await prisma.ticket.findFirst({
    where: { id, userId: session.userId },
  });
  if (!ticket) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }
  if (ticket.status === "CLOSED") {
    return NextResponse.json({ success: false, error: "Ticket is closed" }, { status: 400 });
  }

  const { message } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ success: false, error: "Message required" }, { status: 400 });
  }

  const [msg] = await prisma.$transaction([
    prisma.ticketMessage.create({
      data: {
        ticketId: id,
        senderRole: "USER",
        senderId: session.userId,
        body: message.trim(),
      },
    }),
    prisma.ticket.update({
      where: { id },
      data: { status: "OPEN", updatedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ success: true, data: msg }, { status: 201 });
}

export async function PATCH(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const ticket = await prisma.ticket.findFirst({
    where: { id, userId: session.userId },
  });
  if (!ticket) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  await prisma.ticket.update({
    where: { id },
    data: { status: "CLOSED" },
  });

  return NextResponse.json({ success: true });
}
