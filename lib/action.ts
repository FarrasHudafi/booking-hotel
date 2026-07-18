"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { quoteDynamicPriceForRoom } from "@/lib/data";
import { sendReviewFeedbackEmails } from "@/lib/review-feedback-email";
import { MLApiError } from "@/lib/ml-client";
import {
  ContactSchema,
  ReserveSchema,
  ReviewSchema,
  RoomSchema,
} from "@/lib/zod";
import { del } from "@vercel/blob";
import { differenceInCalendarDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const ContactMessage = async (
  prevState: unknown,
  FormData: FormData,
) => {
  const validateFields = ContactSchema.safeParse(
    Object.fromEntries(FormData.entries()),
  );

  if (!validateFields.success) {
    return { error: validateFields.error.flatten().fieldErrors };
  }

  const { name, email, subject, message } = validateFields.data;

  try {
    await prisma.contact.create({
      data: {
        name,
        email,
        subject,
        message,
      },
    });
    return { message: "Thanks for contact us" };
  } catch (error) {
    console.log(error);
  }
};

export const saveRoom = async (
  image: string,
  prevState: unknown,
  FormData: FormData,
) => {
  if (!image) {
    return { message: "Image is required" };
  }
  const rawData = {
    name: FormData.get("name"),
    description: FormData.get("description"),
    capacity: FormData.get("capacity"),
    price: FormData.get("price"),
    amenities: FormData.getAll("amenities"),
  };
  const validateFields = RoomSchema.safeParse(rawData);
  if (!validateFields.success) {
    return { error: validateFields.error.flatten().fieldErrors };
  }

  const { name, description, capacity, price, amenities } = validateFields.data;

  try {
    await prisma.room.create({
      data: {
        name,
        description,
        image,
        capacity,
        price,
        RoomAmenities: {
          createMany: {
            data: amenities.map((item) => ({
              amenityId: item,
            })),
          },
        },
      },
    });
  } catch (error) {
    console.log(error);
  }
  redirect("/admin/room");
};

//DELETE ROOM
export const deleteRoom = async (id: string, image: string) => {
  try {
    await del(image);
    await prisma.room.delete({
      where: { id },
    });
  } catch (error) {
    console.log(error);
  }
  revalidatePath("/admin/room");
};

// UPDATE ROOM
export const updateRoom = async (
  image: string,
  id: string,
  prevState: unknown,
  FormData: FormData,
) => {
  if (!image) {
    return { message: "Image is required" };
  }
  const rawData = {
    name: FormData.get("name"),
    description: FormData.get("description"),
    capacity: FormData.get("capacity"),
    price: FormData.get("price"),
    amenities: FormData.getAll("amenities"),
  };
  const validateFields = RoomSchema.safeParse(rawData);
  if (!validateFields.success) {
    return { error: validateFields.error.flatten().fieldErrors };
  }

  const { name, description, capacity, price, amenities } = validateFields.data;

  try {
    await prisma.$transaction([
      prisma.room.update({
        where: { id: id },
        data: {
          name,
          description,
          image,
          price,
          capacity,
          RoomAmenities: {
            deleteMany: {},
          },
        },
      }),
      prisma.roomAmenities.createMany({
        data: amenities.map((item) => ({
          roomId: id,
          amenityId: item,
        })),
      }),
    ]);
  } catch (error) {
    console.log(error);
  }
  revalidatePath("/admin/room");
  redirect("/admin/room");
};

export const quoteDynamicPrice = async (
  roomId: string,
  startIso: string,
  endIso: string,
  promoCode?: string,
) => {
  const checkIn = new Date(startIso);
  const checkOut = new Date(endIso);
  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    return { error: "Invalid dates" as const };
  }
  try {
    const quote = await quoteDynamicPriceForRoom(
      roomId,
      checkIn,
      checkOut,
      new Date(),
      promoCode,
    );
    if (!quote) {
      return { error: "Room not found" as const };
    }
    return { ok: true as const, quote };
  } catch (err) {
    const message =
      err instanceof MLApiError
        ? err.message
        : "Gagal menghitung harga dinamis. Coba lagi sebentar.";
    return { error: message };
  }
};

export const createReserve = async (
  roomId: string,
  startDate: Date,
  endDate: Date,
  prevState: unknown,
  FormData: FormData,
) => {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    redirect(`/signin?redirect_url=room/${roomId}`);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDay = new Date(startDate);
  startDay.setHours(0, 0, 0, 0);
  if (startDay < today) {
    return { messageDate: "Check-in date cannot be in the past" };
  }

  const rawData = {
    name: FormData.get("name"),
    phone: FormData.get("phone"),
  };
  const validateFields = ReserveSchema.safeParse(rawData);

  if (!validateFields.success) {
    return {
      error: validateFields.error.flatten().fieldErrors,
    };
  }

  const { name, phone } = validateFields.data;
  const promoCode = String(FormData.get("promoCode") ?? "");
  const night = differenceInCalendarDays(endDate, startDate);
  if (night <= 0) return { messageDate: "Date must be at least 1 night" };

  // Server-side availability check (prevents bypassing UI constraints)
  const conflict = await prisma.reservation.findFirst({
    where: {
      roomId,
      Payment: { status: { not: "failure" } },
      startDate: { lt: endDate },
      endDate: { gt: startDate },
    },
    select: { id: true },
  });
  if (conflict) {
    return { messageDate: "Selected dates are unavailable" };
  }

  let pricing: Awaited<ReturnType<typeof quoteDynamicPriceForRoom>>;
  try {
    pricing = await quoteDynamicPriceForRoom(
      roomId,
      startDate,
      endDate,
      new Date(),
      promoCode,
    );
  } catch (err) {
    const message =
      err instanceof MLApiError
        ? err.message
        : "Gagal menghitung harga dinamis. Coba lagi sebentar.";
    return { message };
  }
  if (!pricing) {
    return { message: "Unable to compute price for this room" };
  }
  const nightly = pricing.effectivePricePerNight;
  const total = pricing.totalAfterDiscount;

  let reservationId;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        data: {
          name,
          phone,
        },
        where: {
          id: session.user.id,
        },
      });

      const reservation = await tx.reservation.create({
        data: {
          startDate: startDate,
          endDate: endDate,
          price: nightly,
          roomId: roomId,
          userId: session.user.id as string,
          Payment: {
            create: {
              amount: total,
            },
          },
        },
      });
      reservationId = reservation.id;
    });
  } catch (error) {
    console.log(error);
  }
  redirect(`/checkout/${reservationId}`);
};

type ReviewFormState = {
  message?: string;
  error?: {
    rating?: string[];
    comment?: string[];
    _form?: string[];
  };
} | null;

export const submitRoomReview = async (
  reservationId: string,
  prevState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> => {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      error: { _form: ["Anda harus masuk untuk memberi ulasan."] },
    };
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      Payment: true,
      Room: { select: { name: true } },
    },
  });
  if (!reservation || reservation.userId !== session.user.id) {
    return { error: { _form: ["Reservasi tidak ditemukan."] } };
  }

  const paid =
    (reservation.Payment?.status ?? "").toLowerCase() === "paid";
  if (!paid) {
    return {
      error: {
        _form: [
          "Ulasan hanya bisa dikirim jika pembayaran sudah lunas (bukan pending atau gagal).",
        ],
      },
    };
  }

  const now = new Date();
  if (reservation.endDate > now) {
    return {
      error: {
        _form: [
          "Ulasan bisa dikirim setelah tanggal checkout reservasi ini lewat.",
        ],
      },
    };
  }

  const existing = await prisma.review.findUnique({
    where: { reservationId },
    select: { id: true },
  });
  if (existing) {
    return {
      error: {
        _form: [
          "Anda sudah pernah mengirim ulasan untuk reservasi ini (satu kali per pemesanan).",
        ],
      },
    };
  }

  const raw = {
    rating: formData.get("rating"),
    comment: formData.get("comment"),
  };
  const parsed = ReviewSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: parsed.error.flatten().fieldErrors,
    };
  }

  const commentRaw = parsed.data.comment?.trim() ?? "";
  const comment = commentRaw.length > 0 ? commentRaw : null;
  const roomId = reservation.roomId;

  try {
    await prisma.review.create({
      data: {
        reservationId,
        roomId,
        userId: session.user.id,
        rating: parsed.data.rating,
        comment,
      },
    });
    revalidatePath(`/room/${roomId}`);
    revalidatePath("/myreservation");
    revalidatePath(`/myreservation/${reservationId}`);
    revalidatePath(`/myreservation/${reservationId}/review`);

    let message = "Ulasan Anda telah dikirim.";
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true },
    });
    const guestEmail = dbUser?.email ?? session.user.email;

    if (guestEmail) {
      const { guestSent } = await sendReviewFeedbackEmails({
        guestEmail,
        guestName: dbUser?.name ?? session.user.name ?? null,
        roomName: reservation.Room.name,
        rating: parsed.data.rating,
        comment,
        reservationId,
      });
      if (guestSent) {
        message += ` Konfirmasi dikirim ke ${guestEmail}.`;
      } else {
        message +=
          " Cek folder Spam/Promosi jika konfirmasi email belum masuk.";
      }
    } else {
      message +=
        " Email konfirmasi tidak terkirim (alamat email akun tidak ditemukan).";
    }

    return { message };
  } catch (error) {
    console.error("submitRoomReview", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          error: {
            _form: [
              "Ulasan untuk reservasi ini sudah ada (satu kali per pemesanan).",
            ],
          },
        };
      }
      if (error.code === "P2021") {
        return {
          error: {
            _form: [
              "Tabel ulasan belum tersedia di database. Jalankan migrasi Prisma (migrate deploy) di server.",
            ],
          },
        };
      }
    }
    return { error: { _form: ["Gagal menyimpan ulasan. Coba lagi."] } };
  }
};
