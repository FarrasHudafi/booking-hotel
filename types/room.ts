import { Prisma } from "@prisma/client";

export type RoomProp = Prisma.RoomGetPayload<{
  include: { RoomAmenities: { select: { amenityId: true } } };
}>;
