import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const getAmenities = async () => {
  const session = await auth();

  if (!session || !session.user) {
    throw new Error("Unauthorized access");
  }

  try {
    const result = await prisma.amenities.findMany();
    return result;
  } catch (error) {}
};

export const getRoom = async () => {
  try {
    const result = await prisma.room.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return result;
  } catch (error) {}
};

export const getRoomById = async (roomId: string) => {
  try {
    const result = await prisma.room.findUnique({
      where: { id: roomId },
      include: { RoomAmenities: { select: { amenityId: true } } },
    });
    return result;
  } catch (error) {}
};

export const getRoomDetailById = async (roomId: string) => {
  try {
    const result = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        RoomAmenities: {
          include: {
            amenities: {
              select: { name: true },
            },
          },
        },
      },
    });
    return result;
  } catch (error) {}
};
