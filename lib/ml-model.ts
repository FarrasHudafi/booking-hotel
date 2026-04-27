/**
 * Ridge Regression model untuk prediksi harga kamar.
 *
 * - Target: price_ratio = reservation_price / room_base_price (scale-invariant).
 * - Features: lihat lib/ml-features.ts (isFriSat, isSunday, isMidweek,
 *   isHoliday, isSchoolHoliday, monthSin, monthCos, leadTimeNorm, occupancyRate, bias).
 * - Solver: closed-form normal equation dengan L2 regularisasi (ridge).
 *     theta = (X^T X + lambda * I)^-1 X^T y
 *   Bias term (kolom terakhir) tidak di-regularisasi.
 * - Cold start: synthetic prior di-seed agar model stabil saat data histori minim.
 * - Data real di-bobotkan 3x relatif prior agar sinyal asli lebih dominan saat ada.
 */

import { addDays, differenceInCalendarDays, eachDayOfInterval, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  FEATURE_KEYS,
  FEATURE_LABELS,
  type FeatureKey,
  type FeatureVector,
  extractFeatures,
  toVector,
} from "@/lib/ml-features";
import trainingDataset from "@/lib/data/training-dataset.json";

type DatasetRow = {
  nightDate: string;
  bookingDate: string;
  priceRatio: number;
  occupancyRate: number;
  roomType: string;
};

// ============================================================================
// TYPES
// ============================================================================

export type TrainedModel = {
  weights: number[]; // length = FEATURE_KEYS.length + 1 (bias)
  trainedAt: Date;
  realSampleCount: number;
  datasetSampleCount: number;
  syntheticSampleCount: number;
  rSquared: number;
  meanTarget: number;
};

export type FeatureContribution = {
  key: FeatureKey;
  label: string;
  weight: number;
  featureValue: number;
  contribution: number; // weight * featureValue (log-space approximation)
};

// ============================================================================
// MATRIX OPERATIONS (hand-rolled, untuk matriks kecil ~10x10)
// ============================================================================

type Matrix = number[][];

function transpose(m: Matrix): Matrix {
  const rows = m.length;
  const cols = m[0].length;
  const t: Matrix = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) t[j][i] = m[i][j];
  }
  return t;
}

function matMul(a: Matrix, b: Matrix): Matrix {
  const aRows = a.length;
  const aCols = a[0].length;
  const bCols = b[0].length;
  const r: Matrix = Array.from({ length: aRows }, () => new Array(bCols).fill(0));
  for (let i = 0; i < aRows; i++) {
    for (let k = 0; k < aCols; k++) {
      const aik = a[i][k];
      for (let j = 0; j < bCols; j++) r[i][j] += aik * b[k][j];
    }
  }
  return r;
}

function matVec(a: Matrix, v: number[]): number[] {
  const r = new Array(a.length).fill(0);
  for (let i = 0; i < a.length; i++) {
    let s = 0;
    for (let j = 0; j < v.length; j++) s += a[i][j] * v[j];
    r[i] = s;
  }
  return r;
}

/**
 * Gauss-Jordan inverse dengan partial pivoting.
 * Dilempar exception jika matriks singular (fallback disiapkan pemanggil).
 */
function inverse(m: Matrix): Matrix {
  const n = m.length;
  const a: Matrix = m.map((row) => [...row]);
  const inv: Matrix = Array.from({ length: n }, (_, i) => {
    const row = new Array(n).fill(0);
    row[i] = 1;
    return row;
  });

  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(a[k][i]) > Math.abs(a[pivot][i])) pivot = k;
    }
    if (pivot !== i) {
      [a[i], a[pivot]] = [a[pivot], a[i]];
      [inv[i], inv[pivot]] = [inv[pivot], inv[i]];
    }
    const diag = a[i][i];
    if (Math.abs(diag) < 1e-10) {
      throw new Error("Singular matrix during inverse");
    }
    for (let j = 0; j < n; j++) {
      a[i][j] /= diag;
      inv[i][j] /= diag;
    }
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = a[k][i];
      if (factor === 0) continue;
      for (let j = 0; j < n; j++) {
        a[k][j] -= factor * a[i][j];
        inv[k][j] -= factor * inv[i][j];
      }
    }
  }
  return inv;
}

// ============================================================================
// RIDGE REGRESSION SOLVER
// ============================================================================

/**
 * theta = (X^T X + lambda * I)^-1 X^T y
 * Bias term (last column, assumed to always be 1) tidak di-regularisasi.
 */
function solveRidge(X: Matrix, y: number[], lambda: number): number[] {
  const d = X[0].length;
  const Xt = transpose(X);
  const XtX = matMul(Xt, X);
  for (let i = 0; i < d - 1; i++) XtX[i][i] += lambda;
  const XtXinv = inverse(XtX);
  const Xty = matVec(Xt, y);
  return matVec(XtXinv, Xty);
}

// ============================================================================
// TRAINING DATA BUILDERS
// ============================================================================

type Sample = { x: FeatureVector; y: number };

/**
 * Bangun training samples dari reservasi sukses 180 hari terakhir.
 * Satu sample per-malam menginap. Occupancy per-tanggal dihitung sekali (not per night).
 */
async function buildRealSamples(daysBack = 180): Promise<Sample[]> {
  const endDate = new Date();
  const startDate = subDays(endDate, daysBack);

  const [totalRooms, reservations] = await Promise.all([
    prisma.room.count(),
    prisma.reservation.findMany({
      where: {
        Payment: { status: { not: "failure" } },
        startDate: { gte: startDate },
      },
      select: {
        startDate: true,
        endDate: true,
        price: true,
        createdAt: true,
        Room: { select: { price: true } },
      },
    }),
  ]);

  // Precompute occupancy per tanggal (unit: room-nights sold / total rooms)
  const roomNightsByDate = new Map<string, number>();
  for (const res of reservations) {
    const end = subDays(res.endDate, 1);
    if (end < res.startDate) continue;
    const nights = eachDayOfInterval({ start: res.startDate, end });
    for (const night of nights) {
      const k = night.toISOString().slice(0, 10);
      roomNightsByDate.set(k, (roomNightsByDate.get(k) ?? 0) + 1);
    }
  }
  const denom = Math.max(1, totalRooms);

  const samples: Sample[] = [];
  for (const res of reservations) {
    const basePrice = res.Room?.price ?? 0;
    if (basePrice <= 0) continue;
    const ratio = res.price / basePrice;
    // Outlier filter — drop jika terlalu ekstrim (kemungkinan dirty data)
    if (ratio < 0.3 || ratio > 3.0) continue;

    const end = subDays(res.endDate, 1);
    if (end < res.startDate) continue;
    const nights = eachDayOfInterval({ start: res.startDate, end });
    for (const night of nights) {
      const k = night.toISOString().slice(0, 10);
      const occ = Math.min(1, (roomNightsByDate.get(k) ?? 0) / denom);
      const feats = extractFeatures({
        nightDate: night,
        bookingDate: res.createdAt,
        occupancyRate: occ,
      });
      samples.push({ x: toVector(feats), y: ratio });
    }
  }
  return samples;
}

/**
 * Bangun training samples dari dataset historis statis (xlsx → JSON di build time).
 * Sumber: lib/data/training-dataset.json (di-generate via scripts/convert-dataset.py).
 *
 * Sengaja pakai pipeline `extractFeatures` yang sama dengan live data — supaya
 * fitur train & inference identik. Kolom `Month Sin`/`Is Holiday`/dll di xlsx
 * di-ignore; kita re-derive dari raw date pakai kalender holiday di ml-features.
 */
function buildDatasetSamples(): Sample[] {
  const rows = trainingDataset as DatasetRow[];
  const samples: Sample[] = [];
  for (const r of rows) {
    const ratio = r.priceRatio;
    if (!Number.isFinite(ratio) || ratio < 0.3 || ratio > 3.0) continue;

    const nightDate = new Date(r.nightDate);
    const bookingDate = new Date(r.bookingDate);
    if (Number.isNaN(nightDate.getTime()) || Number.isNaN(bookingDate.getTime())) continue;

    const feats = extractFeatures({
      nightDate,
      bookingDate,
      occupancyRate: r.occupancyRate,
    });
    samples.push({ x: toVector(feats), y: ratio });
  }
  return samples;
}

/**
 * Synthetic prior samples — mengkodekan "common sense" pricing industri perhotelan
 * sebagai training data lemah. Ini menghindari cold-start failure (matriks singular
 * atau prediksi random) saat belum ada reservasi. Saat data real banyak, efeknya
 * jadi tidak signifikan karena jumlahnya kecil + bobot real-samples 3x.
 *
 * Note: ini BUKAN rule-based multiplier — model tetap belajar koefisien sendiri,
 * synthetic hanya mem-bias arah awal.
 */
function buildSyntheticSamples(): Sample[] {
  const samples: Sample[] = [];
  const today = new Date();
  // deterministic PRNG supaya reproducible
  let seed = 1;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let daysOut = 1; daysOut <= 180; daysOut += 2) {
    for (let variant = 0; variant < 2; variant++) {
      const night = addDays(today, daysOut);
      const leadDays = Math.max(1, daysOut - variant * 45);
      const booking = subDays(night, leadDays);
      const occ = 0.35 + rand() * 0.55;

      const feats = extractFeatures({
        nightDate: night,
        bookingDate: booking,
        occupancyRate: occ,
      });

      // Prior target: kombinasi lemah — akan di-shrink oleh regularisasi + diluted oleh data real
      let y = 1.0;
      if (feats.isFriSat) y *= 1.07;
      if (feats.isSunday) y *= 0.97;
      if (feats.isMidweek) y *= 0.96;
      if (feats.isHoliday) y *= 1.22;
      if (feats.isSchoolHoliday) y *= 1.12;
      // Seasonal — peak pertengahan tahun & Desember (cocok pola Indonesia)
      // Juni=5, Juli=6, Agustus=7, Desember=11 dominan positive
      y *= 1 + feats.monthSin * 0.03 + feats.monthCos * -0.02;
      // Last-minute surge
      if (feats.leadTimeNorm < 0.08) y *= 1.1;
      else if (feats.leadTimeNorm > 0.7) y *= 0.93;
      // Occupancy elasticity
      y *= 1 + (feats.occupancyRate - 0.5) * 0.18;
      // noise
      y *= 0.97 + rand() * 0.06;

      samples.push({ x: toVector(feats), y });
    }
  }
  return samples;
}

// ============================================================================
// MODEL CACHE (in-memory, process-lifetime)
// ============================================================================

let cached: TrainedModel | null = null;
let inflight: Promise<TrainedModel> | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 jam

export function invalidateModel(): void {
  cached = null;
}

export async function getOrTrainModel(): Promise<TrainedModel> {
  if (cached && Date.now() - cached.trainedAt.getTime() < CACHE_TTL_MS) {
    return cached;
  }
  // Request coalescing — kalau banyak caller bareng, cuma 1 yang training
  if (inflight) return inflight;
  inflight = trainModel()
    .then((m) => {
      cached = m;
      return m;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

async function trainModel(): Promise<TrainedModel> {
  const real = await buildRealSamples(180);
  const dataset = buildDatasetSamples();
  const synthetic = buildSyntheticSamples();

  // Layered priors:
  //   - synthetic (~180 rows): weak common-sense prior, di-shrink oleh ridge
  //   - dataset   (~1.6k rows): historical real-world signal (xlsx), 1x weight
  //   - real      (live DB):    upweight 3x supaya production data tetap dominan
  //                             begitu cukup banyak reservasi terkumpul
  const combined: Sample[] = [...synthetic, ...dataset, ...real, ...real, ...real];

  const X: Matrix = combined.map((s) => s.x);
  const y: number[] = combined.map((s) => s.y);

  let weights: number[];
  try {
    weights = solveRidge(X, y, 0.8);
  } catch {
    // Fallback: kalau solver gagal, pakai bobot netral (semua 0 kecuali bias=1)
    weights = new Array(FEATURE_KEYS.length + 1).fill(0);
    weights[weights.length - 1] = 1.0;
  }

  // R² pada gabungan dataset (bukan test set terpisah — dataset kecil)
  const meanY = y.reduce((a, b) => a + b, 0) / y.length;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < X.length; i++) {
    let pred = 0;
    for (let j = 0; j < weights.length; j++) pred += X[i][j] * weights[j];
    ssRes += (y[i] - pred) ** 2;
    ssTot += (y[i] - meanY) ** 2;
  }
  const rSquared = ssTot > 1e-9 ? 1 - ssRes / ssTot : 0;

  return {
    weights,
    trainedAt: new Date(),
    realSampleCount: real.length,
    datasetSampleCount: dataset.length,
    syntheticSampleCount: synthetic.length,
    rSquared,
    meanTarget: meanY,
  };
}

// ============================================================================
// PREDICTION
// ============================================================================

const MIN_RATIO = 0.7;
const MAX_RATIO = 1.5;

export function predictRatio(params: {
  nightDate: Date;
  bookingDate: Date;
  occupancyRate: number;
  model: TrainedModel;
}): number {
  const feats = extractFeatures(params);
  const x = toVector(feats);
  let pred = 0;
  for (let i = 0; i < x.length; i++) pred += x[i] * params.model.weights[i];
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, pred));
}

/**
 * Per-feature contribution terhadap prediksi (weight_i * feature_i).
 * Bias term tidak dimasukkan (itu baseline).
 */
export function explainPrediction(params: {
  nightDate: Date;
  bookingDate: Date;
  occupancyRate: number;
  model: TrainedModel;
}): FeatureContribution[] {
  const feats = extractFeatures(params);
  const x = toVector(feats);
  const out: FeatureContribution[] = [];
  for (let i = 0; i < FEATURE_KEYS.length; i++) {
    const key = FEATURE_KEYS[i];
    const w = params.model.weights[i];
    const xi = x[i];
    out.push({
      key,
      label: FEATURE_LABELS[key],
      weight: w,
      featureValue: xi,
      contribution: w * xi,
    });
  }
  return out;
}

/** Rata-rata kontribusi per-fitur sepanjang stay. */
export function explainStay(params: {
  checkIn: Date;
  checkOut: Date;
  bookingDate: Date;
  occupancyRate: number;
  model: TrainedModel;
}): FeatureContribution[] {
  const nights = Math.max(1, differenceInCalendarDays(params.checkOut, params.checkIn));
  const acc: FeatureContribution[] = FEATURE_KEYS.map((key) => ({
    key,
    label: FEATURE_LABELS[key],
    weight: params.model.weights[FEATURE_KEYS.indexOf(key)],
    featureValue: 0,
    contribution: 0,
  }));
  for (let i = 0; i < nights; i++) {
    const night = addDays(params.checkIn, i);
    const perNight = explainPrediction({
      nightDate: night,
      bookingDate: params.bookingDate,
      occupancyRate: params.occupancyRate,
      model: params.model,
    });
    for (let j = 0; j < acc.length; j++) {
      acc[j].featureValue += perNight[j].featureValue;
      acc[j].contribution += perNight[j].contribution;
    }
  }
  for (const a of acc) {
    a.featureValue /= nights;
    a.contribution /= nights;
  }
  return acc;
}
