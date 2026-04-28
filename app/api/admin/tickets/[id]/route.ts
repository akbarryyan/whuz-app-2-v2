import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

interface Params { params: Promise<{ id: string }> }

/**
 * GET   /api/admin/tickets/[id]  — get ticket detail with all messages
 * POST  /api/admin/tickets/[id]  — admin reply to ticket
 * PATCH /api/admin/tickets/[id]  — update ticket status
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
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

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const { message } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ success: false, error: "Message required" }, { status: 400 });
  }

  const [msg] = await prisma.$transaction([
    prisma.ticketMessage.create({
      data: {
        ticketId: id,
        senderRole: "ADMIN",
        senderId: session.userId ?? null,
        body: message.trim(),
      },
    }),
    prisma.ticket.update({
      where: { id },
      data: { status: "REPLIED", updatedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ success: true, data: msg }, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const { status } = await req.json();
  if (!["OPEN", "REPLIED", "CLOSED"].includes(status)) {
    return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
  }

  await prisma.ticket.update({ where: { id }, data: { status } });
  return NextResponse.json({ success: true });
}
