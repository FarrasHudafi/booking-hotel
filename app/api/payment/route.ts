import { NextResponse } from "next/server";
import Midtrans from "midtrans-client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const snap = new Midtrans.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
});

const formatMidtransLocalTime = (date: Date) => {
  // Midtrans expects: "YYYY-MM-DD HH:mm:ss Z" e.g. "2026-03-17 15:30:00 +0700"
  const pad = (n: number) => String(n).padStart(2, "0");

  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  // getTimezoneOffset: minutes behind UTC (WIB = -420)
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const offH = pad(Math.floor(abs / 60));
  const offM = pad(abs % 60);

  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss} ${sign}${offH}${offM}`;
};

export const POST = async (request: Request) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      reservationId?: string;
      id?: string;
    };
    const reservationId = body.reservationId ?? body.id;
    if (!reservationId) {
      return NextResponse.json(
        { message: "reservationId is required" },
        { status: 400 },
      );
    }

    if (!process.env.MIDTRANS_SERVER_KEY) {
      return NextResponse.json(
        { message: "MIDTRANS_SERVER_KEY is not set" },
        { status: 500 },
      );
    }
    if (!process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY) {
      return NextResponse.json(
        { message: "NEXT_PUBLIC_MIDTRANS_CLIENT_KEY is not set" },
        { status: 500 },
      );
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        User: { select: { name: true, email: true } },
        Payment: true,
      },
    });
    if (!reservation || !reservation.Payment) {
      return NextResponse.json(
        { message: "Reservation not found" },
        { status: 404 },
      );
    }
    if (reservation.userId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const amount = reservation.Payment.amount || 0;
    if (amount <= 0) {
      return NextResponse.json(
        { message: "Invalid gross_amount" },
        { status: 400 },
      );
    }

    const now = new Date();
    const existingExpiry = reservation.Payment.midtransExpiryAt;
    const hasExistingToken =
      reservation.Payment.status?.toLowerCase() === "pending" &&
      !!reservation.Payment.midtransToken &&
      !!reservation.Payment.midtransOrderId &&
      !!existingExpiry &&
      existingExpiry.getTime() > now.getTime();

    if (hasExistingToken) {
      return NextResponse.json(
        {
          token: reservation.Payment.midtransToken,
          orderId: reservation.Payment.midtransOrderId,
          redirectUrl: reservation.Payment.midtransRedirectUrl,
          reused: true,
        },
        { status: 200 },
      );
    }

    // Make order_id unique so user can retry payment when expired/none
    const orderId = `${reservation.id}-${Date.now()}`;
    const durationMinutes = 10;
    const expiryAt = new Date(now.getTime() + durationMinutes * 60_000);

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      expiry: {
        start_time: formatMidtransLocalTime(new Date()),
        unit: "minute",
        duration: durationMinutes,
      },
      credit_card: {
        secure: true,
      },
      customer_details: {
        first_name: reservation.User.name ?? undefined,
        email: reservation.User.email ?? undefined,
      },
    };

    const transaction = await snap.createTransaction(parameter);

    await prisma.payment.update({
      where: { reservationId: reservation.id },
      data: {
        status: "pending",
        midtransOrderId: orderId,
        midtransToken: transaction.token,
        midtransRedirectUrl: transaction.redirect_url,
        midtransExpiryAt: expiryAt,
        midtransPayload: transaction as unknown as object,
      },
    });

    return NextResponse.json({
      token: transaction.token,
      orderId,
      redirectUrl: transaction.redirect_url,
      reused: false,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { message: "Midtrans transaction error", detail },
      { status: 500 },
    );
  }
};
