"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ContactSchema, ReserveSchema, RoomSchema } from "@/lib/zod";
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

export const createReserve = async (
  roomId: string,
  price: number,
  startDate: Date,
  endDate: Date,
  prevState: unknown,
  FormData: FormData,
) => {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    redirect(`/signin?redirect_url=room/${roomId}`);
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
  const night = differenceInCalendarDays(endDate, startDate);
  if (night <= 0) return { messageDate: "Date must be at least 1 night" };
  const total = night * price;

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
          price: price,
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
