/**
 * ML-Based Dynamic Pricing — public API.
 *
 * Pipeline:
 *   1. Model di-train sekali (ridge regression, ditraining dari reservasi historis
 *      + synthetic prior) lalu di-cache 1 jam. Lihat lib/ml-model.ts.
 *   2. Untuk tiap malam dalam stay, ekstrak feature (lib/ml-features.ts) lalu
 *      prediksi rasio harga. Combined multiplier = rata-rata rasio per malam.
 *   3. Breakdown per-faktor = weight_i × feature_i (linear model → kontribusi aditif),
 *      dikelompokkan ke kategori UI (DoW, Holiday, School Holiday, Seasonal, Demand, Lead Time).
 *   4. Confidence = mix R² model dengan sample-size adequacy (min 30 real samples → full weight).
 *
 * Harga final = clamp(predicted_ratio, 0.7, 1.5) × base_price.
 */

import { addDays, differenceInCalendarDays, subDays } from "date-fns";
import {
  FEATURE_KEYS,
  getHolidaysInRange,
  isHoliday,
  isSchoolHoliday,
  type FeatureKey,
} from "@/lib/ml-features";
import {
  getOrTrainModel,
  predictRatio,
  explainStay,
  invalidateModel,
  type TrainedModel,
} from "@/lib/ml-model";

// ============================================================================
// PUBLIC TYPES (dipakai oleh lib/data.ts & components/reserve-form.tsx)
// ============================================================================

export type PriceFactor = {
  name: string;
  impact: number; // multiplier-like: 1 + contribution (display-friendly)
  weight: number; // raw bobot model untuk fitur terkait
  description: string;
};

export type PriceBreakdown = {
  dayOfWeekFactor: number;
  holidayFactor: number;
  schoolHolidayFactor: number;
  seasonalFactor: number;
  demandFactor: number;
  leadTimeFactor: number;
  combinedMultiplier: number;
};

export type MLPricePrediction = {
  basePrice: number;
  predictedPrice: number;
  confidence: number;
  factors: PriceFactor[];
  breakdown: PriceBreakdown;
};

// Re-exports agar lib/data.ts & consumer lain tetap stabil
export { getHolidaysInRange, isHoliday, isSchoolHoliday, invalidateModel };
export type { HolidayInfo } from "@/lib/ml-features";
export type { TrainedModel };

// ============================================================================
// MAIN PREDICTION
// ============================================================================

/**
 * Floor untuk occupancyRate input — hindari extrapolation di bawah training
 * distribution. Dataset (lib/data/training-dataset.json) punya min occ ~0.22 dan
 * mean ~0.57; saat live system belum punya reservasi (occ=0), prediksi raw bisa
 * jeblok ke clamp bawah karena weight occupancy dominan (+0.7). Floor di-apply
 * HANYA di inference, training data tetap utuh.
 */
const OCCUPANCY_INPUT_FLOOR = 0.3;

export async function predictMLPrice(params: {
  basePrice: number;
  checkIn: Date;
  checkOut: Date;
  bookingDate: Date;
  occupancyRate?: number;
}): Promise<MLPricePrediction> {
  const { basePrice, checkIn, checkOut, bookingDate, occupancyRate: rawOcc = 0.5 } = params;
  const occupancyRate = Math.max(OCCUPANCY_INPUT_FLOOR, Math.min(1, rawOcc));
  const stayNights = Math.max(1, differenceInCalendarDays(checkOut, checkIn));

  const model = await getOrTrainModel();

  // Rata-rata predicted ratio di seluruh malam stay
  let ratioSum = 0;
  for (let i = 0; i < stayNights; i++) {
    ratioSum += predictRatio({
      nightDate: addDays(checkIn, i),
      bookingDate,
      occupancyRate,
      model,
    });
  }
  const combinedMultiplier = ratioSum / stayNights;
  const predictedPrice = Math.max(1, Math.round(basePrice * combinedMultiplier));

  // Kontribusi per-feature (rata-rata sepanjang stay)
  const contribs = explainStay({
    checkIn,
    checkOut,
    bookingDate,
    occupancyRate,
    model,
  });
  const byKey = new Map<FeatureKey, { weight: number; featureValue: number; contribution: number }>();
  for (const c of contribs) byKey.set(c.key, c);
  const cont = (k: FeatureKey) => byKey.get(k)?.contribution ?? 0;
  const val = (k: FeatureKey) => byKey.get(k)?.featureValue ?? 0;
  const w = (k: FeatureKey) => byKey.get(k)?.weight ?? 0;

  // Grouping kontribusi ke kategori UI
  const dowContribution = cont("isFriSat") + cont("isSunday") + cont("isMidweek");
  const holidayContribution = cont("isHoliday");
  const schoolContribution = cont("isSchoolHoliday");
  const seasonalContribution = cont("monthSin") + cont("monthCos");
  const demandContribution = cont("occupancyRate");
  const leadContribution = cont("leadTimeNorm");

  const breakdown: PriceBreakdown = {
    dayOfWeekFactor: 1 + dowContribution,
    holidayFactor: 1 + holidayContribution,
    schoolHolidayFactor: 1 + schoolContribution,
    seasonalFactor: 1 + seasonalContribution,
    demandFactor: 1 + demandContribution,
    leadTimeFactor: 1 + leadContribution,
    combinedMultiplier,
  };

  // Factors list — skip yang pengaruhnya ~0 supaya UI bersih
  const factors: PriceFactor[] = [];
  const push = (
    name: string,
    contribution: number,
    weight: number,
    description: string,
    force = false,
  ) => {
    if (!force && Math.abs(contribution) < 0.003) return;
    factors.push({
      name,
      impact: 1 + contribution,
      weight,
      description,
    });
  };

  const dowAvgWeight = (w("isFriSat") + w("isSunday") + w("isMidweek")) / 3;
  push("Day of Week", dowContribution, dowAvgWeight, "Weekday vs weekend (model-learned)", true);

  if (val("isHoliday") > 0) {
    const holidays = getHolidaysInRange(checkIn, subDays(checkOut, 1));
    const desc = holidays.length > 0 ? holidays.map((h) => h.name).join(", ") : "Public holiday";
    push("Holiday", holidayContribution, w("isHoliday"), desc, true);
  }
  if (val("isSchoolHoliday") > 0) {
    push("School Holiday", schoolContribution, w("isSchoolHoliday"), "School holiday period", true);
  }

  const seasonalWeight = (w("monthSin") + w("monthCos")) / 2;
  push("Seasonal", seasonalContribution, seasonalWeight, "Annual seasonal cycle (sin/cos)", true);

  push("Demand (occupancy)", demandContribution, w("occupancyRate"), "Stay-window occupancy rate", true);

  const leadDays = Math.max(0, differenceInCalendarDays(checkIn, bookingDate));
  push("Lead Time", leadContribution, w("leadTimeNorm"), `${leadDays} days to check-in`, true);

  // Confidence: R² model (clamped) + data-adequacy.
  // Dataset historis (xlsx) dihitung 0.5x relatif live data — ada signal nyata
  // tapi tidak se-otoritatif transaksi produksi sendiri.
  const r2 = Math.max(0, Math.min(1, model.rSquared));
  const effectiveSamples = model.realSampleCount + model.datasetSampleCount * 0.5;
  const sampleAdequacy = Math.min(1, effectiveSamples / 200);
  const confidence = 0.35 * r2 + 0.65 * sampleAdequacy;

  return {
    basePrice,
    predictedPrice,
    confidence: Math.max(0.05, Math.min(1, confidence)),
    factors,
    breakdown,
  };
}

// ============================================================================
// DEBUG / ADMIN
// ============================================================================

/**
 * Introspection helper — untuk diagnostik admin (tidak dipanggil dari UI user).
 * Berguna untuk verifikasi model sudah belajar sesuai ekspektasi.
 */
export async function getModelDiagnostics(): Promise<{
  trainedAt: Date;
  realSamples: number;
  syntheticSamples: number;
  rSquared: number;
  meanTarget: number;
  weights: Record<string, number>;
}> {
  const model = await getOrTrainModel();
  const weights: Record<string, number> = {};
  FEATURE_KEYS.forEach((k, i) => {
    weights[k] = model.weights[i];
  });
  weights["bias"] = model.weights[FEATURE_KEYS.length];
  return {
    trainedAt: model.trainedAt,
    realSamples: model.realSampleCount,
    syntheticSamples: model.syntheticSampleCount,
    rSquared: model.rSquared,
    meanTarget: model.meanTarget,
    weights,
  };
}
