import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export type ChatMessageDto = {
  id: string;
  role: string;
  body: string;
  createdAt: string;
};

export type ChatConversationDto = {
  id: string;
  guestName: string;
  guestEmail: string;
  status: string;
  lastMessageAt: string;
  createdAt: string;
  lastMessage?: ChatMessageDto | null;
  unreadCount?: number;
};

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return null;
  }
  return session;
}

export async function getConversationForGuest(
  conversationId: string,
  sessionToken: string,
) {
  return prisma.chatConversation.findFirst({
    where: { id: conversationId, sessionToken },
  });
}

export function serializeMessage(message: {
  id: string;
  role: string;
  body: string;
  createdAt: Date;
}): ChatMessageDto {
  return {
    id: message.id,
    role: message.role,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function createConversationWithWelcome(
  guestName: string,
  guestEmail: string,
  userId?: string | null,
) {
  const sessionToken = randomUUID();
  const welcomeBody =
    "Hello! Welcome to BookHotel support. How can we help you today?";

  const conversation = await prisma.chatConversation.create({
    data: {
      guestName,
      guestEmail,
      sessionToken,
      userId: userId ?? null,
      messages: {
        create: {
          role: "system",
          body: welcomeBody,
        },
      },
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return conversation;
}

export async function appendChatMessage(
  conversationId: string,
  role: "guest" | "admin" | "system",
  body: string,
  senderUserId?: string | null,
) {
  const [message] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        conversationId,
        role,
        body,
        senderUserId: senderUserId ?? null,
      },
    }),
    prisma.chatConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  return message;
}
