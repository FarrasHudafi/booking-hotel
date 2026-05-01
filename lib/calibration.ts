/**
 * Layer kalibrasi prediksi ADR ke skala harga lokal (IDR).
 *
 * Model Ridge Regression dilatih pada dataset *Hotel Booking Demand*
 * (Antonio et al., 2019) yang harganya dalam EUR. Untuk diaplikasikan
 * pada hotel dengan struktur harga sendiri (`Room.price` di Postgres),
 * prediksi EUR diperlakukan sebagai **multiplier relatif** terhadap
 * mean ADR dataset, bukan sebagai harga absolut.
 *
 *   predicted_idr = base_price_idr × (predicted_eur / DATASET_MEAN_EUR)
 *
 * Dengan begitu pola seasonality, lead-time effect, dan weekend factor
 * yang dipelajari dari ratusan ribu booking nyata tetap dipakai, sambil
 * menjaga skala harga sesuai pasar lokal.
 *
 * Mean dataset = 97.04 EUR (lihat docs/experiment_summary.json,
 * `dataset.target_stats.mean`).
 */

import { ArrivalMonth } from "@/lib/ml-client";

// Mean ADR pada subset training Resort Hotel (v2-resort).
// Sumber: docs/experiment_summary.json -> dataset.target_stats.mean.
// Update bersamaan dengan retraining model.
export const DATASET_MEAN_ADR_EUR = 88.8;

// Clamping range untuk multiplier kalibrasi.
// Setelah fitur ``arrival_date_year`` di-drop dari training (lihat
// ml_backend/src/preprocessing.py: EXTRAPOLATION_RISK_COLS), kasus terburuk
// extrapolasi tahun sudah hilang. Bound di-relax dari [0.7, 1.5] ke
// [0.5, 2.0] supaya model masih punya ruang ekspresi untuk kombinasi fitur
// ekstrem (low-season + lead time besar + occupancy 0, dst.) tapi tetap
// terbatas pada rentang harga yang masuk akal di pasar. Saat clamp aktif,
// badge "Clamped" muncul di UI sebagai sinyal prediksi out-of-distribution.
export const MIN_MULTIPLIER = 0.8;
export const MAX_MULTIPLIER = 2.0;

// Indonesian weekend localization layer.
// Antonio dataset mendefinisikan weekend = Sabtu + Minggu dan koefisien
// `stays_in_weekend_nights` tidak masuk top-10 fitur dominan pada subset
// resort. Konvensi pasar Indonesia berbeda — premium berlaku pada Jumat
// + Sabtu. Kalibrasi ini menambahkan uplift +5% per malam Jum/Sab,
// dinormalisasi terhadap total malam stay. Magnitudo 5% disetel berdasar
// koefisien `isFriSat` di sistem dynamic-pricing lokal (lib/ml-pricing.ts)
// yang memberi day-of-week factor sekitar +5–6% dalam test produksi.
export const FRISAT_NIGHT_UPLIFT = 0.05;

export interface CalibrationInput {
  predictedEur: number;
  basePriceIdr: number;
  /** Jumlah malam Jumat/Sabtu pada stay (konvensi Indonesia). */
  frisatNights?: number;
  /** Total malam stay (untuk normalisasi). */
  totalNights?: number;
}

export interface CalibrationOutput {
  predictedIdr: number;
  basePriceIdr: number;
  predictedEur: number;
  datasetMeanEur: number;
  rawMultiplier: number; // ratio EUR sebelum lokalisasi & clamp
  weekendUplift: number; // pengali tambahan dari konvensi weekend Indonesia
  multiplier: number; // multiplier final setelah lokalisasi & clamp
  deltaPct: number; // (multiplier - 1) * 100 — % deviasi dari harga normal
  band: PriceBand;
  clamped: "low" | "high" | null; // alasan clamp jika terjadi
  frisatNights: number;
  totalNights: number;
}

export type PriceBand =
  | "deeply_below" // < -15 %
  | "below" //       -15 % .. -5 %
  | "near_average" //  -5 % .. +5 %
  | "above" //        +5 % .. +15 %
  | "deeply_above"; //  > +15 %

export function calibrate({
  predictedEur,
  basePriceIdr,
  frisatNights = 0,
  totalNights = 1,
}: CalibrationInput): CalibrationOutput {
  const rawMultiplier = predictedEur / DATASET_MEAN_ADR_EUR;

  // Lapisan lokalisasi Indonesia: uplift proporsional jumlah malam Jum/Sab.
  // 1 dari 1 malam (semua weekend) -> +5%. 0 dari 1 malam (weekday) -> +0%.
  // Diapply sebelum clamp supaya bound MIN/MAX_MULTIPLIER tetap mengikat
  // hasil akhir.
  const safeTotal = Math.max(1, totalNights);
  const weekendUplift =
    1 + FRISAT_NIGHT_UPLIFT * (frisatNights / safeTotal);

  const beforeClamp = rawMultiplier * weekendUplift;

  let multiplier = beforeClamp;
  let clamped: "low" | "high" | null = null;
  if (beforeClamp < MIN_MULTIPLIER) {
    multiplier = MIN_MULTIPLIER;
    clamped = "low";
  } else if (beforeClamp > MAX_MULTIPLIER) {
    multiplier = MAX_MULTIPLIER;
    clamped = "high";
  }

  const predictedIdr = Math.round(basePriceIdr * multiplier);
  const deltaPct = (multiplier - 1) * 100;

  return {
    predictedIdr,
    basePriceIdr,
    predictedEur,
    datasetMeanEur: DATASET_MEAN_ADR_EUR,
    rawMultiplier,
    weekendUplift,
    multiplier,
    deltaPct,
    band: bandOf(deltaPct),
    clamped,
    frisatNights,
    totalNights: safeTotal,
  };
}

function bandOf(deltaPct: number): PriceBand {
  if (deltaPct < -15) return "deeply_below";
  if (deltaPct < -5) return "below";
  if (deltaPct <= 5) return "near_average";
  if (deltaPct <= 15) return "above";
  return "deeply_above";
}

// ---------------------------------------------------------------------------
// Klasifikasi musim — sederhana, untuk narasi UI bukan untuk model.
// Mengikuti pola top-10 koefisien pada experiment_summary.json:
//   - Jan/Feb/Mar -> low season (koefisien negatif besar)
//   - Aug/Sep -> high season (koefisien positif besar)
//   - lainnya -> mid season
// ---------------------------------------------------------------------------
export type Season = "low" | "mid" | "high";

const HIGH: ArrivalMonth[] = ["July", "August", "September"];
const LOW: ArrivalMonth[] = ["January", "February", "March", "November"];

export function classifySeason(month: ArrivalMonth): Season {
  if (HIGH.includes(month)) return "high";
  if (LOW.includes(month)) return "low";
  return "mid";
}
