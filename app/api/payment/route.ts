import { NextResponse } from "next/server";
import Midtrans from "midtrans-client";
import { reservationProps } from "@/types/reservation";

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
    const reservation: reservationProps = await request.json();
    const amount = reservation.Payment?.amount || 0;

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
    if (!reservation?.id) {
      return NextResponse.json(
        { message: "Invalid reservation payload" },
        { status: 400 },
      );
    }
    if (amount <= 0) {
      return NextResponse.json(
        { message: "Invalid gross_amount" },
        { status: 400 },
      );
    }

    // Make order_id unique so user can retry payment when status is pending
    const orderId = `${reservation.id}-${Date.now()}`;

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      expiry: {
        start_time: formatMidtransLocalTime(new Date()),
        unit: "minute",
        duration: 10,
      },
      credit_card: {
        secure: true,
      },
      customer_details: {
        first_name: reservation.User.name,
        email: reservation.User.email,
      },
    };

    const transaction = await snap.createTransaction(parameter);
    return NextResponse.json({ token: transaction.token });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { message: "Midtrans transaction error", detail },
      { status: 500 },
    );
  }
};
