import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { addDays, differenceInCalendarDays } from "date-fns";
import {
  computeAvailabilityByDateRange,
  type AvailabilityByType,
  type IntervalBooking,
} from "@/lib/availability";
import {
  computeDynamicNightlyPrice,
  computeRevPAR,
  decomposeRevPAR,
  estimatePriceElasticityOfDemand,
} from "@/lib/dynamic-pricing";
import { applyPromoDiscount } from "@/lib/promo";

export const getAmenities = async () => {
  const session = await auth();

  if (!session || !session.user) {
    throw new Error("Unauthorized access");
  }

  try {
    const result = await prisma.amenities.findMany();
    return result;
  } catch (error) {
    console.log(error);
  }
};

export const getRoom = async () => {
  try {
    const result = await prisma.room.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return result;
  } catch (error) {
    console.log(error);
  }
};

export const getRoomById = async (roomId: string) => {
  try {
    const result = await prisma.room.findUnique({
      where: { id: roomId },
      include: { RoomAmenities: { select: { amenityId: true } } },
    });
    return result;
  } catch (error) {
    console.log(error);
  }
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
  } catch (error) {
    console.log(error);
  }
};

export const getReservationById = async (id: string) => {
  try {
    const result = await prisma.reservation.findUnique({
      where: { id },
      include: {
        Room: {
          select: {
            name: true,
            image: true,
            price: true,
          },
        },
        User: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        Payment: true,
      },
    });
    return result;
  } catch (error) {
    console.log(error);
  }
};

export const getDisableRoomById = async (roomId: string) => {
  try {
    const result = await prisma.reservation.findMany({
      select: {
        startDate: true,
        endDate: true,
      },
      where: {
        roomId: roomId,
        Payment: { status: { not: "failure" } },
      },
    });
    return result;
  } catch (error) {
    console.log(error);
  }
};

export const getReservationByUserId = async () => {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    throw new Error("Unauthorized access");
  }
  try {
    const result = await prisma.reservation.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        Room: {
          select: {
            name: true,
            image: true,
            price: true,
          },
        },
        User: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        Payment: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return result;
  } catch (error) {
    console.log(error);
  }
};

export const getRevenueAndReserve = async () => {
  try {
    const result = await prisma.reservation.aggregate({
      _count: true,
      _sum: {
        price: true,
      },
      where: {
        Payment: { status: { not: "failure" } },
      },
    });
    return {
      revenue: result._sum.price || 0,
      reserve: result._count,
    };
  } catch (error) {
    console.log(error);
  }
};

export const getTotalCustomer = async () => {
  try {
    const result = await prisma.reservation.findMany({
      distinct: ["userId"],
      where: {
        Payment: { status: { not: "failure" } },
      },
      select: { userId: true },
    });
    return result;
  } catch (error) {
    console.log(error);
  }
};

export const getReservations = async () => {
  const session = await auth();

  if (
    !session ||
    !session.user ||
    !session.user.id ||
    session.user.role !== "admin"
  ) {
    throw new Error("Unauthorized access");
  }
  try {
    const result = await prisma.reservation.findMany({
      include: {
        Room: {
          select: {
            name: true,
            image: true,
            price: true,
          },
        },
        User: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        Payment: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return result;
  } catch (error) {
    console.log(error);
  }
};

/** Okupansi rata-rata di jendela menginap: sold room-nights / (total kamar × malam). */
export const getOccupancyForStayWindow = async (start: Date, end: Date) => {
  const totalRooms = await prisma.room.count();
  const stayNights = Math.max(1, differenceInCalendarDays(end, start));
  if (totalRooms === 0) {
    return {
      occupancyRate: 0,
      totalRooms,
      soldRoomNights: 0,
      availableRoomNights: 0,
    };
  }

  const reservations = await prisma.reservation.findMany({
    where: {
      Payment: { status: { not: "failure" } },
      startDate: { lt: end },
      endDate: { gt: start },
    },
    select: { startDate: true, endDate: true },
  });

  let soldRoomNights = 0;
  for (const res of reservations) {
    const os = res.startDate > start ? res.startDate : start;
    const oe = res.endDate < end ? res.endDate : end;
    const n = differenceInCalendarDays(oe, os);
    if (n > 0) soldRoomNights += n;
  }

  const availableRoomNights = totalRooms * stayNights;
  const occupancyRate =
    availableRoomNights > 0
      ? Math.min(1, soldRoomNights / availableRoomNights)
      : 0;

  return {
    occupancyRate,
    totalRooms,
    soldRoomNights,
    availableRoomNights,
  };
};

export type RevPARMetrics = {
  revpar: number;
  adr: number;
  occupancyRate: number;
  totalRevenue: number;
  soldRoomNights: number;
  availableRoomNights: number;
  priceElasticityEstimate: number;
  decomposedRevPAR: number;
};

/**
 * Metrik RevPAR & ADR untuk periode terakhir (pendapatan dari pembayaran sukses / room-nights tersedia).
 */
export const getRevPARMetricsLastDays = async (
  days = 30,
): Promise<RevPARMetrics | undefined> => {
  try {
    const periodEnd = new Date();
    const periodStart = addDays(periodEnd, -days);
    const totalRooms = await prisma.room.count();
    if (totalRooms === 0) {
      return {
        revpar: 0,
        adr: 0,
        occupancyRate: 0,
        totalRevenue: 0,
        soldRoomNights: 0,
        availableRoomNights: 0,
        priceElasticityEstimate: estimatePriceElasticityOfDemand(0),
        decomposedRevPAR: 0,
      };
    }

    const revenueAgg = await prisma.payment.aggregate({
      where: {
        status: { not: "failure" },
        createdAt: { gte: periodStart },
      },
      _sum: { amount: true },
    });
    const totalRevenue = revenueAgg._sum.amount ?? 0;

    const reservations = await prisma.reservation.findMany({
      where: {
        Payment: { status: { not: "failure" } },
        startDate: { lt: periodEnd },
        endDate: { gt: periodStart },
      },
      select: { startDate: true, endDate: true },
    });

    let soldRoomNights = 0;
    for (const res of reservations) {
      const os = res.startDate > periodStart ? res.startDate : periodStart;
      const oe = res.endDate < periodEnd ? res.endDate : periodEnd;
      const n = differenceInCalendarDays(oe, os);
      if (n > 0) soldRoomNights += n;
    }

    const availableRoomNights = totalRooms * days;
    const revpar = computeRevPAR(totalRevenue, availableRoomNights);
    const occupancyRate =
      availableRoomNights > 0
        ? Math.min(1, soldRoomNights / availableRoomNights)
        : 0;
    const adr =
      soldRoomNights > 0 ? Math.round(totalRevenue / soldRoomNights) : 0;
    const priceElasticityEstimate =
      estimatePriceElasticityOfDemand(occupancyRate);
    const decomposedRevPAR = decomposeRevPAR(adr, occupancyRate);

    return {
      revpar,
      adr,
      occupancyRate,
      totalRevenue,
      soldRoomNights,
      availableRoomNights,
      priceElasticityEstimate,
      decomposedRevPAR,
    };
  } catch (error) {
    console.log(error);
  }
};

export const quoteDynamicPriceForRoom = async (
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  bookingDate: Date = new Date(),
  promoCode?: string,
) => {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return null;

  const { occupancyRate } = await getOccupancyForStayWindow(checkIn, checkOut);
  const breakdown = computeDynamicNightlyPrice({
    basePricePerNight: room.price,
    checkIn,
    checkOut,
    bookingDate,
    occupancyRate,
  });

  const subtotalStay = breakdown.stayNights * breakdown.effectivePricePerNight;
  const promo = applyPromoDiscount(subtotalStay, promoCode);

  return {
    roomId: room.id,
    ...breakdown,
    totalStay: subtotalStay,
    promoCode: promo.promoCode,
    promoDescription: promo.promoDescription,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    discountAmount: promo.discountAmount,
    totalAfterDiscount: promo.totalAfterDiscount,
    promoRawInputCode: promo.rawInputCode,
    promoError: promo.error ?? null,
  };
};

/**
 * Availability “berbasis tipe kamar” untuk rentang tanggal, dengan asumsi:
 * - Tipe kamar diwakili oleh `Room.name`
 * - Jumlah unit per tipe = banyaknya record `Room` dengan `name` yang sama
 *
 * Jika kamu nanti punya tabel/kolom stock resmi (mis. `RoomType.units`), ganti sumber `totalUnitsByType` saja;
 * komputasi overlap + agregasi per hari tetap sama.
 */
export const getAvailabilityByRoomName = async (
  checkIn: Date,
  checkOut: Date,
): Promise<AvailabilityByType[]> => {
  const reqIn = new Date(checkIn);
  const reqOut = new Date(checkOut);
  if (Number.isNaN(reqIn.getTime()) || Number.isNaN(reqOut.getTime())) {
    throw new Error("Invalid dates");
  }

  const rooms = await prisma.room.findMany({ select: { id: true, name: true } });
  const totalUnitsByType: Record<string, number> = {};
  const roomIdToType = new Map<string, string>();
  for (const r of rooms) {
    roomIdToType.set(r.id, r.name);
    totalUnitsByType[r.name] = (totalUnitsByType[r.name] ?? 0) + 1;
  }

  const reservations = await prisma.reservation.findMany({
    where: {
      Payment: { status: { not: "failure" } },
      startDate: { lt: reqOut },
      endDate: { gt: reqIn },
    },
    select: {
      startDate: true,
      endDate: true,
      roomId: true,
    },
  });

  const bookings: IntervalBooking[] = [];
  for (const res of reservations) {
    const typeKey = roomIdToType.get(res.roomId);
    if (!typeKey) continue;
    bookings.push({
      typeKey,
      checkIn: res.startDate,
      checkOut: res.endDate,
      units: 1,
    });
  }

  return computeAvailabilityByDateRange({
    request: { checkIn: reqIn, checkOut: reqOut },
    bookings,
    totalUnitsByType,
  });
};
