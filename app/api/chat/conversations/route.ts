import { auth } from "@/auth";
import {
  createConversationWithWelcome,
  requireAdmin,
  serializeMessage,
  type ChatConversationDto,
} from "@/lib/chat";
import { prisma } from "@/lib/prisma";
import { StartChatSchema } from "@/lib/zod";
import { NextResponse } from "next/server";

export const POST = async (request: Request) => {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = StartChatSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const session = await auth();
  const { name, email } = parsed.data;

  try {
    const conversation = await createConversationWithWelcome(
      name,
      email,
      session?.user?.id,
    );

    return NextResponse.json(
      {
        conversationId: conversation.id,
        sessionToken: conversation.sessionToken,
        messages: conversation.messages.map(serializeMessage),
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/chat/conversations", err);
    return NextResponse.json(
      { error: "Failed to start chat" },
      { status: 500 },
    );
  }
};

export const GET = async (request: Request) => {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");

  try {
    const conversations = await prisma.chatConversation.findMany({
      where:
        statusFilter === "open" || statusFilter === "closed"
          ? { status: statusFilter }
          : undefined,
      orderBy: { lastMessageAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const payload: ChatConversationDto[] = conversations.map((c) => ({
      id: c.id,
      guestName: c.guestName,
      guestEmail: c.guestEmail,
      status: c.status,
      lastMessageAt: c.lastMessageAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
      lastMessage: c.messages[0] ? serializeMessage(c.messages[0]) : null,
    }));

    return NextResponse.json({ conversations: payload }, { status: 200 });
  } catch (err) {
    console.error("GET /api/chat/conversations", err);
    return NextResponse.json(
      { error: "Failed to load conversations" },
      { status: 500 },
    );
  }
};
