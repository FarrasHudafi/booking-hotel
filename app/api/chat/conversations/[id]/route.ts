import { appendChatMessage, requireAdmin } from "@/lib/chat";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const PATCH = async (request: Request, context: RouteContext) => {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const requestedStatus =
    typeof json === "object" &&
    json !== null &&
    "status" in json &&
    typeof (json as { status: unknown }).status === "string"
      ? (json as { status: string }).status
      : null;

  if (requestedStatus !== "closed" && requestedStatus !== "open") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const existing = await prisma.chatConversation.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    if (existing.status === requestedStatus) {
      return NextResponse.json(
        {
          conversation: { id, status: existing.status },
          message: "No change",
        },
        { status: 200 },
      );
    }

    const conversation = await prisma.chatConversation.update({
      where: { id },
      data: { status: requestedStatus },
    });

    const systemBody =
      requestedStatus === "closed"
        ? "Obrolan ini telah ditutup oleh admin. Terima kasih telah menghubungi BookHotel."
        : "Obrolan dibuka kembali oleh admin. Silakan lanjutkan percakapan.";

    await appendChatMessage(id, "system", systemBody);

    return NextResponse.json(
      {
        conversation: {
          id: conversation.id,
          status: conversation.status,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("PATCH /api/chat/conversations/[id]", err);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 },
    );
  }
};
