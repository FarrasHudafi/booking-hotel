import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentProps } from "@/types/payment";
import crypto from "crypto";

export const POST = async (request: Request) => {
  const data: PaymentProps = await request.json();
  // order_id may be "reservationId-timestamp" for retry payments
  const reservationId = data.order_id.split("-")[0];

  let responseData = null;
  const transactionStatus = data.transaction_status;
  const paymentType = data.payment_type || null;
  const fraudStatus = data.fraud_status;
  const statusCode = data.status_code;
  const grossAmount = data.gross_amount;
  const signatureKey = data.signature_key;

  const hash = crypto
    .createHash("sha512")
    .update(
      `${data.order_id}${statusCode}${grossAmount}${process.env.MIDTRANS_SERVER_KEY}`,
    )
    .digest("hex");

  if (hash !== signatureKey) {
    return NextResponse.json(
      { message: "Invalid signature key" },
      { status: 400 },
    );
  }

  if (transactionStatus == "capture") {
    if (fraudStatus == "accept") {
      const transaction = await prisma.payment.update({
        data: {
          method: paymentType,
          status: "paid",
          midtransOrderId: data.order_id,
          midtransPayload: data as unknown as object,
        },
        where: {
          reservationId: reservationId,
        },
      });
      responseData = transaction;
    }
  } else if (transactionStatus == "settlement") {
    const transaction = await prisma.payment.update({
      data: {
        method: paymentType,
        status: "paid",
        midtransOrderId: data.order_id,
        midtransPayload: data as unknown as object,
      },
      where: {
        reservationId: reservationId,
      },
    });
    responseData = transaction;
  } else if (
    transactionStatus == "cancel" ||
    transactionStatus == "deny" ||
    transactionStatus == "expire"
  ) {
    const transaction = await prisma.payment.update({
      data: {
        method: paymentType,
        status: "failure",
        midtransOrderId: data.order_id,
        midtransPayload: data as unknown as object,
      },
      where: {
        reservationId: reservationId,
      },
    });
    responseData = transaction;
  } else if (transactionStatus == "pending") {
    const transaction = await prisma.payment.update({
      data: {
        method: paymentType,
        status: "pending",
        midtransOrderId: data.order_id,
        midtransPayload: data as unknown as object,
      },
      where: {
        reservationId: reservationId,
      },
    });
    responseData = transaction;
  }

  return NextResponse.json({ responseData }, { status: 200 });
};
