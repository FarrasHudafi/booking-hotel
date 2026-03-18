import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

type Body = {
  reservationId?: string;
  method?: string | null;
  status?: "pending" | "paid";
};

export const POST = async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const reservationId = body.reservationId;
  if (!reservationId) {
    return NextResponse.json(
      { message: "reservationId is required" },
      { status: 400 },
    );
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { userId: true, Payment: { select: { status: true } } },
  });

  if (!reservation) {
    return NextResponse.json(
      { message: "Reservation not found" },
      { status: 404 },
    );
  }
  if (reservation.userId !== session.user.id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // Don't allow overwriting a paid payment back to pending.
  if (reservation.Payment?.status === "paid") {
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }

  const nextStatus = body.status ?? "pending";
  if (nextStatus !== "pending" && nextStatus !== "paid") {
    return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  }

  const updated = await prisma.payment.update({
    where: { reservationId },
    data: {
      status: nextStatus,
      method: body.method ?? undefined,
    },
  });

  return NextResponse.json({ ok: true, payment: updated }, { status: 200 });
};
