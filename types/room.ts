import { Prisma } from "@prisma/client";

export type RoomProp = Prisma.RoomGetPayload<{
  include: { RoomAmenities: { select: { amenityId: true } } };
}>;

export type RoomDetailProp = Prisma.RoomGetPayload<{
  include: {
    RoomAmenities: {
      include: {
        amenities: { select: { name: true; } };
      };
    };
  };
}>;
