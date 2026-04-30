/**
 * Klien HTTP untuk ML backend (FastAPI).
 *
 * Mengekspos type-definition yang sinkron dengan Pydantic schema di
 * `ml_backend/api/schemas.py`, plus fungsi `predictPrice` dan `checkHealth`.
 */

export type HotelType = "City Hotel" | "Resort Hotel";

export type MealType = "BB" | "HB" | "FB" | "SC" | "Undefined";

export type ArrivalMonth =
  | "January"
  | "February"
  | "March"
  | "April"
  | "May"
  | "June"
  | "July"
  | "August"
  | "September"
  | "October"
  | "November"
  | "December";

export type MarketSegment =
  | "Online TA"
  | "Offline TA/TO"
  | "Direct"
  | "Corporate"
  | "Groups"
  | "Complementary"
  | "Aviation"
  | "Undefined";

export type DistributionChannel =
  | "TA/TO"
  | "Direct"
  | "Corporate"
  | "GDS"
  | "Undefined";

export type CustomerType =
  | "Transient"
  | "Transient-Party"
  | "Contract"
  | "Group";

export type DepositType = "No Deposit" | "Non Refund" | "Refundable";

export type RoomType =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "K"
  | "L"
  | "P";

export interface BookingInput {
  hotel: HotelType;
  lead_time: number;
  arrival_date_year: number;
  arrival_date_month: ArrivalMonth;
  arrival_date_week_number: number;
  arrival_date_day_of_month: number;
  stays_in_weekend_nights: number;
  stays_in_week_nights: number;
  adults: number;
  children: number;
  babies: number;
  meal: MealType;
  country: string;
  market_segment: MarketSegment;
  distribution_channel: DistributionChannel;
  is_repeated_guest: 0 | 1;
  previous_cancellations: number;
  previous_bookings_not_canceled: number;
  reserved_room_type: RoomType;
  assigned_room_type: RoomType;
  booking_changes: number;
  deposit_type: DepositType;
  agent: number;
  company: number;
  days_in_waiting_list: number;
  customer_type: CustomerType;
  required_car_parking_spaces: number;
  total_of_special_requests: number;
}

export interface PredictionResponse {
  predicted_adr: number;
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
  input: BookingInput,
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
