import { addDays, differenceInCalendarDays } from "date-fns";

export type IntervalBooking = {
  /** Key tipe kamar (mis. roomTypeId / room.name) */
  typeKey: string;
  /** Check-in (inklusif) */
  checkIn: Date;
  /** Check-out (eksklusif) */
  checkOut: Date;
  /** Jumlah unit yang dipakai booking ini (default 1) */
  units?: number;
};

export type AvailabilityByType = {
  typeKey: string;
  requested: { checkIn: Date; checkOut: Date; nights: number };
  totalUnits: number;
  /** minimal sisa unit pada salah satu hari dalam rentang */
  minRemainingUnits: number;
  /** true bila minRemainingUnits > 0 */
  available: boolean;
  /**
   * Sisa unit per hari (format key: YYYY-MM-DD), untuk malam menginap.
   * Contoh: request 2026-04-07 -> 2026-04-10 menghasilkan 3 hari: 07, 08, 09.
   */
  remainingByDay: Record<string, number>;
  /** Terpakai per hari (format key: YYYY-MM-DD) */
  usedByDay: Record<string, number>;
};

function startOfDayLocal(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayKey(d: Date): string {
  // Local day key (stabil untuk kalender bisnis)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Aturan overlap interval (umum, checkOut eksklusif):
 * Booking A overlap dengan request jika A.checkIn < req.checkOut dan A.checkOut > req.checkIn.
 */
export function overlaps(aIn: Date, aOut: Date, bIn: Date, bOut: Date): boolean {
  return aIn < bOut && aOut > bIn;
}

/**
 * Pengecekan availability berbasis agregasi per-hari (difference array).
 *
 * Intuisi:
 * - Kita definisikan jendela hari untuk request sebagai N malam: [checkIn, checkOut) dengan N = diffDays.
 * - Untuk setiap booking yang overlap, kita ambil irisan intervalnya di dalam jendela request:
 *   overlapStart = max(booking.checkIn, req.checkIn)
 *   overlapEnd   = min(booking.checkOut, req.checkOut)
 * - Karena checkOut eksklusif, booking mengonsumsi unit untuk setiap hari t di [overlapStart, overlapEnd)
 *
 * Kompleksitas:
 * - Naif “cek manual per booking per hari”: O(B * N)
 * - Dengan difference array: O(B + N) per tipe (setelah booking dikelompokkan per tipe)
 */
export function computeAvailabilityByDateRange(params: {
  request: { checkIn: Date; checkOut: Date };
  bookings: IntervalBooking[];
  totalUnitsByType: Record<string, number>;
}): AvailabilityByType[] {
  const reqIn = startOfDayLocal(params.request.checkIn);
  const reqOut = startOfDayLocal(params.request.checkOut);
  const nights = differenceInCalendarDays(reqOut, reqIn);
  if (Number.isNaN(reqIn.getTime()) || Number.isNaN(reqOut.getTime())) {
    throw new Error("Invalid request dates");
  }
  if (nights <= 0) {
    throw new Error("Request must be at least 1 night (checkOut > checkIn)");
  }

  const typeKeys = Object.keys(params.totalUnitsByType);
  const bookingsByType = new Map<string, IntervalBooking[]>();
  for (const b of params.bookings) {
    if (!bookingsByType.has(b.typeKey)) bookingsByType.set(b.typeKey, []);
    bookingsByType.get(b.typeKey)!.push(b);
  }

  const results: AvailabilityByType[] = [];
  for (const typeKey of typeKeys) {
    const totalUnits = params.totalUnitsByType[typeKey] ?? 0;
    const diff = new Array<number>(nights + 1).fill(0);
    const list = bookingsByType.get(typeKey) ?? [];

    for (const raw of list) {
      const units = raw.units ?? 1;
      if (units <= 0) continue;

      const bIn = startOfDayLocal(raw.checkIn);
      const bOut = startOfDayLocal(raw.checkOut);
      if (Number.isNaN(bIn.getTime()) || Number.isNaN(bOut.getTime())) continue;
      if (bOut <= bIn) continue;
      if (!overlaps(bIn, bOut, reqIn, reqOut)) continue;

      const os = bIn > reqIn ? bIn : reqIn;
      const oe = bOut < reqOut ? bOut : reqOut;
      const startIdx = differenceInCalendarDays(os, reqIn);
      const endIdx = differenceInCalendarDays(oe, reqIn);
      if (startIdx < 0 || endIdx <= 0) continue;
      if (startIdx >= nights) continue;

      diff[startIdx] += units;
      diff[Math.min(nights, endIdx)] -= units;
    }

    const usedByDay: Record<string, number> = {};
    const remainingByDay: Record<string, number> = {};
    let used = 0;
    let minRemainingUnits = Number.POSITIVE_INFINITY;
    for (let i = 0; i < nights; i++) {
      used += diff[i];
      const day = addDays(reqIn, i);
      const key = dayKey(day);
      const remaining = Math.max(0, totalUnits - used);
      usedByDay[key] = used;
      remainingByDay[key] = remaining;
      if (remaining < minRemainingUnits) minRemainingUnits = remaining;
    }

    if (!Number.isFinite(minRemainingUnits)) minRemainingUnits = Math.max(0, totalUnits);

    results.push({
      typeKey,
      requested: { checkIn: reqIn, checkOut: reqOut, nights },
      totalUnits,
      minRemainingUnits,
      available: minRemainingUnits > 0,
      remainingByDay,
      usedByDay,
    });
  }

  return results;
}

