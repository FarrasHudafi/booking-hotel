import { addDays, differenceInCalendarDays } from "date-fns";

/** Batas multiplier agar harga tetap wajar untuk demo / produksi ringan */
export const DYNAMIC_PRICE_MIN_FACTOR = 0.78;
export const DYNAMIC_PRICE_MAX_FACTOR = 1.38;

export type DynamicPriceBreakdown = {
  basePricePerNight: number;
  effectivePricePerNight: number;
  /** Faktor gabungan (setelah clamp) */
  combinedFactor: number;
  leadTimeFactor: number;
  peakSeasonFactor: number;
  demandFactor: number;
  /** Estimasi |ε| — permintaan relatif tidak elastis saat okupansi tinggi */
  priceElasticityEstimate: number;
  /** Saran ADR berdasarkan heuristik RevPAR (bukan harga transaksi) */
  recommendedRevPARTarget: number;
  averageOccupancyRate: number;
  stayNights: number;
  leadDays: number;
};

/**
 * Multiplier lead-time: diskon booking jauh hari, surge mendadak.
 * Lead = hari dari tanggal transaksi (hari ini) sampai check-in.
 */
export function computeLeadTimeMultiplier(leadDays: number): number {
  const d = Math.max(0, leadDays);
  if (d >= 75) return 0.9;
  if (d >= 45) return 0.94;
  if (d >= 28) return 0.97;
  if (d >= 14) return 1;
  if (d >= 7) return 1.04;
  if (d >= 3) return 1.09;
  if (d >= 1) return 1.14;
  return 1.2;
}

/** Musim ramai sederhana (kalender) — rata-rata per malam menginap */
export function computePeakSeasonFactorForNight(date: Date): number {
  const m = date.getMonth() + 1;
  const day = date.getDate();
  // Liburan akhir tahun
  if (m === 12 && day >= 18) return 1.12;
  if (m === 1 && day <= 8) return 1.1;
  // Musim panas (hemisfer utara / liburan umum)
  if (m >= 6 && m <= 8) return 1.07;
  // Akhir pekan (Jumat–Sabtu malam): sedikit premium
  const dow = date.getDay();
  if (dow === 5 || dow === 6) return 1.035;
  return 1;
}

export function averagePeakFactorForStay(checkIn: Date, checkOut: Date): number {
  const nights = Math.max(1, differenceInCalendarDays(checkOut, checkIn));
  let sum = 0;
  for (let i = 0; i < nights; i++) {
    sum += computePeakSeasonFactorForNight(addDays(checkIn, i));
  }
  return sum / nights;
}

/**
 * Permintaan tinggi saat okupansi naik → multiplier naik (revenue management dasar).
 */
export function computeDemandMultiplier(occupancyRate: number): number {
  const o = Math.min(1, Math.max(0, occupancyRate));
  if (o < 0.35) return 0.96;
  if (o < 0.55) return 1;
  if (o < 0.75) return 1.05;
  if (o < 0.9) return 1.1;
  return 1.14;
}

/**
 * Estimasi elastisitas harga (nilai negatif, permintaan turun saat harga naik).
 * Heuristik: saat okupansi tinggi, kurva lebih tidak elastis (|ε| kecil).
 */
export function estimatePriceElasticityOfDemand(occupancyRate: number): number {
  const o = Math.min(1, Math.max(0, occupancyRate));
  // ε ∈ [-1.15, -0.28] — makin penuh hotel, makin kecil |ε|
  return -1.15 + o * 0.87;
}

export function computeRevPAR(totalRevenue: number, availableRoomNights: number): number {
  if (availableRoomNights <= 0) return 0;
  return totalRevenue / availableRoomNights;
}

export function decomposeRevPAR(adr: number, occupancyRate: number): number {
  return adr * Math.min(1, Math.max(0, occupancyRate));
}

export type RevPARImpact = {
  currentRevPAR: number;
  projectedRevPAR: number;
  deltaRevPAR: number;
  projectedOccupancy: number;
};

/**
 * Proyeksi RevPAR jika ADR berubah, dengan respons okupansi linear terhadap perubahan harga.
 */
export function estimateRevPARImpact(params: {
  currentADR: number;
  newADR: number;
  currentOccupancy: number;
  /** Elastisitas (negatif) */
  elasticity: number;
}): RevPARImpact {
  const { currentADR, newADR, currentOccupancy, elasticity } = params;
  const o0 = Math.min(1, Math.max(0, currentOccupancy));
  if (currentADR <= 0) {
    return {
      currentRevPAR: 0,
      projectedRevPAR: 0,
      deltaRevPAR: 0,
      projectedOccupancy: o0,
    };
  }
  const pricePctChange = (newADR - currentADR) / currentADR;
  const projectedOccupancy = Math.min(
    1,
    Math.max(0, o0 + o0 * elasticity * pricePctChange),
  );
  const currentRevPAR = decomposeRevPAR(currentADR, o0);
  const projectedRevPAR = decomposeRevPAR(newADR, projectedOccupancy);
  return {
    currentRevPAR,
    projectedRevPAR,
    deltaRevPAR: projectedRevPAR - currentRevPAR,
    projectedOccupancy,
  };
}

/**
 * Target ADR heuristik untuk “mengoptimalkan” RevPAR: jika permintaan tidak elastis,
 * naikkan harga ke plafon band; jika elastis, dekat median band.
 */
export function computeRevPAROptimalPrice(
  currentPrice: number,
  elasticity: number,
  minPrice: number,
  maxPrice: number,
): number {
  const e = Math.abs(elasticity);
  const clampedMin = Math.min(minPrice, maxPrice);
  const clampedMax = Math.max(minPrice, maxPrice);
  if (e < 0.55) {
    return Math.min(clampedMax, Math.max(clampedMin, Math.round(currentPrice * 1.04)));
  }
  if (e > 0.85) {
    return Math.round((clampedMin + clampedMax) / 2);
  }
  return Math.min(clampedMax, Math.max(clampedMin, Math.round(currentPrice * 1.02)));
}

export function computeDynamicNightlyPrice(params: {
  basePricePerNight: number;
  checkIn: Date;
  checkOut: Date;
  bookingDate: Date;
  occupancyRate: number;
}): DynamicPriceBreakdown {
  const {
    basePricePerNight,
    checkIn,
    checkOut,
    bookingDate,
    occupancyRate,
  } = params;

  const stayNights = Math.max(1, differenceInCalendarDays(checkOut, checkIn));
  const bookDay = new Date(bookingDate);
  bookDay.setHours(0, 0, 0, 0);
  const checkInDay = new Date(checkIn);
  checkInDay.setHours(0, 0, 0, 0);
  const leadDays = differenceInCalendarDays(checkInDay, bookDay);

  const leadTimeFactor = computeLeadTimeMultiplier(leadDays);
  const peakSeasonFactor = averagePeakFactorForStay(checkIn, checkOut);
  const demandFactor = computeDemandMultiplier(occupancyRate);

  let combined =
    leadTimeFactor * peakSeasonFactor * demandFactor;
  combined = Math.min(
    DYNAMIC_PRICE_MAX_FACTOR,
    Math.max(DYNAMIC_PRICE_MIN_FACTOR, combined),
  );

  const effectivePricePerNight = Math.max(
    1,
    Math.round(basePricePerNight * combined),
  );

  const averageOccupancyRate = Math.min(1, Math.max(0, occupancyRate));
  const priceElasticityEstimate =
    estimatePriceElasticityOfDemand(averageOccupancyRate);
  const recommendedRevPARTarget = computeRevPAROptimalPrice(
    effectivePricePerNight,
    priceElasticityEstimate,
    Math.round(basePricePerNight * DYNAMIC_PRICE_MIN_FACTOR),
    Math.round(basePricePerNight * DYNAMIC_PRICE_MAX_FACTOR),
  );

  return {
    basePricePerNight,
    effectivePricePerNight,
    combinedFactor: combined,
    leadTimeFactor,
    peakSeasonFactor,
    demandFactor,
    priceElasticityEstimate,
    recommendedRevPARTarget,
    averageOccupancyRate,
    stayNights,
    leadDays,
  };
}
