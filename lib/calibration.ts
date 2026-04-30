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

export const DATASET_MEAN_ADR_EUR = 97.04;

export interface CalibrationInput {
  predictedEur: number;
  basePriceIdr: number;
}

export interface CalibrationOutput {
  predictedIdr: number;
  basePriceIdr: number;
  predictedEur: number;
  datasetMeanEur: number;
  multiplier: number;
  deltaPct: number; // (multiplier - 1) * 100 — % deviasi dari harga normal
  band: PriceBand;
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
}: CalibrationInput): CalibrationOutput {
  const multiplier = predictedEur / DATASET_MEAN_ADR_EUR;
  const predictedIdr = Math.round(basePriceIdr * multiplier);
  const deltaPct = (multiplier - 1) * 100;
  return {
    predictedIdr,
    basePriceIdr,
    predictedEur,
    datasetMeanEur: DATASET_MEAN_ADR_EUR,
    multiplier,
    deltaPct,
    band: bandOf(deltaPct),
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
