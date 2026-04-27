/**
 * Feature extraction + holiday calendar untuk ML pricing.
 * Pure functions — no DB. Aman di-import dari file lain tanpa side effect.
 */

import { getDay, getMonth, differenceInCalendarDays, isSameDay, isWithinInterval, startOfDay } from "date-fns";

export type HolidayInfo = {
  name: string;
  date: Date;
  type: "national" | "religious" | "school" | "international";
};

// ============================================================================
// INDONESIA HOLIDAY CALENDAR (2024-2027)
// ============================================================================

const INDONESIA_HOLIDAYS: HolidayInfo[] = [
  { name: "Tahun Baru 2024", date: new Date("2024-01-01"), type: "national" },
  { name: "Imlek", date: new Date("2024-02-10"), type: "religious" },
  { name: "Isra Mi'raj", date: new Date("2024-02-08"), type: "religious" },
  { name: "Hari Raya Nyepi", date: new Date("2024-03-11"), type: "religious" },
  { name: "Idul Fitri 1445", date: new Date("2024-04-10"), type: "religious" },
  { name: "Cuti Bersama Idul Fitri", date: new Date("2024-04-11"), type: "religious" },
  { name: "Hari Buruh", date: new Date("2024-05-01"), type: "national" },
  { name: "Hari Raya Waisak", date: new Date("2024-05-23"), type: "religious" },
  { name: "Hari Lahir Pancasila", date: new Date("2024-06-01"), type: "national" },
  { name: "Idul Adha 1445", date: new Date("2024-06-17"), type: "religious" },
  { name: "Tahun Baru Islam 1446", date: new Date("2024-07-07"), type: "religious" },
  { name: "Hari Kemerdekaan", date: new Date("2024-08-17"), type: "national" },
  { name: "Maulid Nabi", date: new Date("2024-09-16"), type: "religious" },
  { name: "Cuti Bersama Natal", date: new Date("2024-12-24"), type: "national" },
  { name: "Hari Natal", date: new Date("2024-12-25"), type: "national" },

  { name: "Tahun Baru 2025", date: new Date("2025-01-01"), type: "national" },
  { name: "Isra Mi'raj 1446", date: new Date("2025-01-27"), type: "religious" },
  { name: "Imlek 2576", date: new Date("2025-01-29"), type: "religious" },
  { name: "Hari Raya Nyepi 1947", date: new Date("2025-03-29"), type: "religious" },
  { name: "Idul Fitri 1446", date: new Date("2025-03-31"), type: "religious" },
  { name: "Cuti Bersama Idul Fitri", date: new Date("2025-04-01"), type: "religious" },
  { name: "Hari Buruh", date: new Date("2025-05-01"), type: "national" },
  { name: "Hari Raya Waisak 2569", date: new Date("2025-05-12"), type: "religious" },
  { name: "Kenaikan Yesus Kristus", date: new Date("2025-05-29"), type: "religious" },
  { name: "Hari Lahir Pancasila", date: new Date("2025-06-01"), type: "national" },
  { name: "Idul Adha 1446", date: new Date("2025-06-06"), type: "religious" },
  { name: "Tahun Baru Islam 1447", date: new Date("2025-06-27"), type: "religious" },
  { name: "Hari Kemerdekaan", date: new Date("2025-08-17"), type: "national" },
  { name: "Maulid Nabi 1447", date: new Date("2025-09-05"), type: "religious" },
  { name: "Cuti Bersama Natal", date: new Date("2025-12-24"), type: "national" },
  { name: "Hari Natal", date: new Date("2025-12-25"), type: "national" },

  { name: "Tahun Baru 2026", date: new Date("2026-01-01"), type: "national" },
  { name: "Isra Mi'raj 1447", date: new Date("2026-01-16"), type: "religious" },
  { name: "Imlek 2577", date: new Date("2026-02-17"), type: "religious" },
  { name: "Hari Raya Nyepi 1948", date: new Date("2026-03-19"), type: "religious" },
  { name: "Idul Fitri 1447", date: new Date("2026-03-20"), type: "religious" },
  { name: "Cuti Bersama Idul Fitri", date: new Date("2026-03-21"), type: "religious" },
  { name: "Hari Buruh", date: new Date("2026-05-01"), type: "national" },
  { name: "Hari Raya Waisak 2570", date: new Date("2026-05-01"), type: "religious" },
  { name: "Kenaikan Yesus Kristus", date: new Date("2026-05-14"), type: "religious" },
  { name: "Idul Adha 1447", date: new Date("2026-05-27"), type: "religious" },
  { name: "Hari Lahir Pancasila", date: new Date("2026-06-01"), type: "national" },
  { name: "Tahun Baru Islam 1448", date: new Date("2026-06-16"), type: "religious" },
  { name: "Hari Kemerdekaan", date: new Date("2026-08-17"), type: "national" },
  { name: "Maulid Nabi 1448", date: new Date("2026-08-26"), type: "religious" },
  { name: "Cuti Bersama Natal", date: new Date("2026-12-24"), type: "national" },
  { name: "Hari Natal", date: new Date("2026-12-25"), type: "national" },

  { name: "Tahun Baru 2027", date: new Date("2027-01-01"), type: "national" },
  { name: "Imlek 2578", date: new Date("2027-02-06"), type: "religious" },
  { name: "Hari Raya Nyepi 1949", date: new Date("2027-03-08"), type: "religious" },
  { name: "Idul Fitri 1448", date: new Date("2027-03-09"), type: "religious" },
  { name: "Cuti Bersama Idul Fitri", date: new Date("2027-03-10"), type: "religious" },
  { name: "Hari Buruh", date: new Date("2027-05-01"), type: "national" },
  { name: "Idul Adha 1448", date: new Date("2027-05-17"), type: "religious" },
  { name: "Hari Raya Waisak 2571", date: new Date("2027-05-20"), type: "religious" },
  { name: "Hari Lahir Pancasila", date: new Date("2027-06-01"), type: "national" },
  { name: "Tahun Baru Islam 1449", date: new Date("2027-06-05"), type: "religious" },
  { name: "Hari Kemerdekaan", date: new Date("2027-08-17"), type: "national" },
  { name: "Maulid Nabi 1449", date: new Date("2027-08-15"), type: "religious" },
  { name: "Hari Natal", date: new Date("2027-12-25"), type: "national" },
];

const SCHOOL_HOLIDAY_PERIODS: { name: string; start: Date; end: Date }[] = [
  { name: "Libur Semester Gasal 2024", start: new Date("2024-12-22"), end: new Date("2025-01-05") },
  { name: "Libur Tengah Semester", start: new Date("2024-03-22"), end: new Date("2024-03-31") },
  { name: "Libur Semester Genap 2024", start: new Date("2024-06-14"), end: new Date("2024-06-30") },

  { name: "Libur Tengah Semester", start: new Date("2025-03-21"), end: new Date("2025-03-30") },
  { name: "Libur Semester Genap 2025", start: new Date("2025-06-13"), end: new Date("2025-06-29") },
  { name: "Libur Semester Gasal 2025", start: new Date("2025-12-20"), end: new Date("2026-01-04") },

  { name: "Libur Tengah Semester", start: new Date("2026-03-20"), end: new Date("2026-03-29") },
  { name: "Libur Semester Genap 2026", start: new Date("2026-06-12"), end: new Date("2026-06-28") },
  { name: "Libur Semester Gasal 2026", start: new Date("2026-12-21"), end: new Date("2027-01-03") },
];

// ============================================================================
// HOLIDAY LOOKUPS
// ============================================================================

export function isHoliday(date: Date): HolidayInfo | null {
  const target = startOfDay(date);
  return INDONESIA_HOLIDAYS.find((h) => isSameDay(h.date, target)) ?? null;
}

export function isSchoolHoliday(date: Date): { name: string } | null {
  for (const p of SCHOOL_HOLIDAY_PERIODS) {
    if (isWithinInterval(date, { start: p.start, end: p.end })) {
      return { name: p.name };
    }
  }
  return null;
}

export function getHolidaysInRange(start: Date, end: Date): HolidayInfo[] {
  const s = startOfDay(start);
  const e = startOfDay(end);
  return INDONESIA_HOLIDAYS.filter((h) => {
    const d = startOfDay(h.date);
    return d >= s && d <= e;
  });
}

// ============================================================================
// FEATURE EXTRACTION
// ============================================================================

export const FEATURE_KEYS = [
  "isFriSat",
  "isSunday",
  "isMidweek",
  "isHoliday",
  "isSchoolHoliday",
  "monthSin",
  "monthCos",
  "leadTimeNorm",
  "occupancyRate",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  isFriSat: "Weekend (Fri-Sat)",
  isSunday: "Sunday",
  isMidweek: "Midweek (Tue-Wed)",
  isHoliday: "Holiday",
  isSchoolHoliday: "School Holiday",
  monthSin: "Seasonal (sin cycle)",
  monthCos: "Seasonal (cos cycle)",
  leadTimeNorm: "Lead time",
  occupancyRate: "Occupancy",
};

export type FeatureVector = number[]; // length FEATURE_KEYS.length + 1 (bias)

export function extractFeatures(params: {
  nightDate: Date;
  bookingDate: Date;
  occupancyRate: number;
}): Record<FeatureKey, number> {
  const { nightDate, bookingDate, occupancyRate } = params;
  const dow = getDay(nightDate);
  const month = getMonth(nightDate); // 0-11
  const lead = Math.max(0, differenceInCalendarDays(nightDate, bookingDate));
  return {
    isFriSat: dow === 5 || dow === 6 ? 1 : 0,
    isSunday: dow === 0 ? 1 : 0,
    isMidweek: dow === 2 || dow === 3 ? 1 : 0,
    isHoliday: isHoliday(nightDate) ? 1 : 0,
    isSchoolHoliday: isSchoolHoliday(nightDate) ? 1 : 0,
    monthSin: Math.sin((2 * Math.PI * month) / 12),
    monthCos: Math.cos((2 * Math.PI * month) / 12),
    leadTimeNorm: Math.min(lead, 90) / 90,
    occupancyRate: Math.min(1, Math.max(0, occupancyRate)),
  };
}

export function toVector(features: Record<FeatureKey, number>): FeatureVector {
  const v = FEATURE_KEYS.map((k) => features[k]);
  v.push(1); // bias term
  return v;
}
