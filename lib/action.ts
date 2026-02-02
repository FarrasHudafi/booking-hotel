"use server";
import { prisma } from "@/lib/prisma";
import { ContactSchema, RoomSchema } from "@/lib/zod";
import { del } from "@vercel/blob";
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
