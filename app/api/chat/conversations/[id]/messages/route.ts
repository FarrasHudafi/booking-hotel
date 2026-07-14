import {
  appendChatMessage,
  getConversationForGuest,
  requireAdmin,
  serializeMessage,
} from "@/lib/chat";
import { prisma } from "@/lib/prisma";
import { SendChatMessageSchema } from "@/lib/zod";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function authorizeConversation(
  conversationId: string,
  request: Request,
) {
  const admin = await requireAdmin();
  if (admin) {
    const conversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) return { error: "not_found" as const };
    return { conversation, asAdmin: true as const, admin };
  }

  const sessionToken = request.headers.get("x-chat-token");
  if (!sessionToken) {
    return { error: "unauthorized" as const };
  }

  const conversation = await getConversationForGuest(
    conversationId,
    sessionToken,
  );
  if (!conversation) return { error: "not_found" as const };

  return { conversation, asAdmin: false as const };
}

export const GET = async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const authResult = await authorizeConversation(id, request);

  if ("error" in authResult) {
    if (authResult.error === "not_found") {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after");

  try {
    const messages = await prisma.chatMessage.findMany({
      where: {
        conversationId: id,
        ...(after ? { createdAt: { gt: new Date(after) } } : {}),
      },
      orderBy: { createdAt: "asc" },
    });

    const conversation = await prisma.chatConversation.findUnique({
      where: { id },
      select: {
        id: true,
        guestName: true,
        guestEmail: true,
        status: true,
      },
    });

    return NextResponse.json(
      {
        conversation,
        messages: messages.map(serializeMessage),
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("GET /api/chat/conversations/[id]/messages", err);
    return NextResponse.json(
      { error: "Failed to load messages" },
      { status: 500 },
    );
  }
};

export const POST = async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const authResult = await authorizeConversation(id, request);

  if ("error" in authResult) {
    if (authResult.error === "not_found") {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (authResult.conversation.status === "closed") {
    return NextResponse.json(
      { error: "This conversation is closed" },
      { status: 403 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SendChatMessageSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const role = authResult.asAdmin ? "admin" : "guest";
  const senderUserId = authResult.asAdmin
    ? authResult.admin.user.id
    : null;

  try {
    const message = await appendChatMessage(
      id,
      role,
      parsed.data.body.trim(),
      senderUserId,
    );

    return NextResponse.json(
      { message: serializeMessage(message) },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/chat/conversations/[id]/messages", err);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
};
