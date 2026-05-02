/**
 * Klien HTTP untuk ML backend (FastAPI).
 *
 * Skema sinkron dengan ``ml_backend/api/schemas.py`` yang kini
 * langsung memakai dataset lokal (dataset_hotel_dynamic_pricing.xlsx).
 * Tidak ada lagi lapisan kalibrasi EUR -> IDR; backend mengembalikan
 * harga prediksi dalam Rupiah secara langsung.
 */

export type RoomType = "Standard" | "Superior" | "Deluxe" | "Suite";

export type Segment =
  | "Leisure"
  | "Business"
  | "Family"
  | "Couple"
  | "Group";

export type Channel =
  | "OTA_Traveloka"
  | "Website"
  | "OTA_Booking"
  | "Corporate"
  | "Phone"
  | "Walk-in";

export interface BookingRequest {
  /** ISO yyyy-mm-dd */
  check_in: string;
  /** ISO yyyy-mm-dd */
  check_out: string;
  room_type: RoomType;
  /** Harga base kamar dalam IDR (sebelum dynamic pricing). */
  base_price: number;
  /** 0..1 (opsional — jika tidak diisi backend akan memakai proxy). */
  occupancy_rate?: number;
  total_guests?: number;
  segment?: Segment;
  channel?: Channel;
}

export interface PredictionResponse {
  predicted_price: number;
  base_price: number;
  raw_price_ratio: number;
  clamped_price_ratio: number;
  delta_rupiah: number;
  delta_pct: number;
  night_date: string;
  lead_time_days: number;
  length_of_stay: number;
  occupancy_rate_used: number;
  currency: string;
  model_version: string;
  status: string;
  timestamp: string;
}

export interface HealthResponse {
  status: "ok" | "degraded" | string;
  model_loaded: boolean;
  timestamp: string;
}

interface ValidationErrorItem {
  loc?: (string | number)[];
  msg?: string;
  type?: string;
}

interface BackendErrorPayload {
  status?: string;
  detail?: string | ValidationErrorItem[];
}

export class MLApiError extends Error {
  readonly statusCode: number;
  readonly fieldErrors?: Record<string, string>;

  constructor(
    message: string,
    statusCode: number,
    fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "MLApiError";
    this.statusCode = statusCode;
    this.fieldErrors = fieldErrors;
  }
}

const BASE_URL = (
  process.env.NEXT_PUBLIC_ML_API_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

const DEFAULT_TIMEOUT_MS = 15_000;

async function request<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(rest.headers ?? {}),
      },
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new MLApiError(
        "Permintaan ke server prediksi melebihi batas waktu. Coba lagi.",
        408,
      );
    }
    throw new MLApiError(
      "Tidak dapat terhubung ke server prediksi. Pastikan backend berjalan di " +
        BASE_URL +
        ".",
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let payload: BackendErrorPayload | null = null;
    try {
      payload = (await response.json()) as BackendErrorPayload;
    } catch {
      // body kosong / non-JSON — abaikan
    }

    if (response.status === 422 && Array.isArray(payload?.detail)) {
      const fieldErrors: Record<string, string> = {};
      for (const item of payload.detail) {
        const field = (item.loc ?? []).filter((v) => v !== "body").join(".");
        if (field) fieldErrors[field] = item.msg ?? "Tidak valid";
      }
      throw new MLApiError(
        "Beberapa input tidak valid. Periksa kembali form Anda.",
        422,
        fieldErrors,
      );
    }

    if (response.status === 503) {
      throw new MLApiError(
        "Model belum siap di server. Hubungi administrator.",
        503,
      );
    }

    const detail =
      typeof payload?.detail === "string"
        ? payload.detail
        : `Permintaan gagal (${response.status}).`;
    throw new MLApiError(detail, response.status);
  }

  return (await response.json()) as T;
}

export function predictPrice(
  input: BookingRequest,
): Promise<PredictionResponse> {
  return request<PredictionResponse>("/predict", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function checkHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health", {
    method: "GET",
    timeoutMs: 5_000,
  });
}
