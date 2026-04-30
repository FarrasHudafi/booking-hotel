"use client";

import { FC, FormEvent, useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  ArrivalMonth,
  BookingInput,
  HotelType,
  RoomType,
} from "@/lib/ml-client";

// ---------------------------------------------------------------------------
// Pemetaan kategori nama kamar -> kode anonim di dataset (A..L).
// Pemetaan ini disengaja konservatif: kamar premium (Suite) tidak dipetakan
// ke huruf paling akhir karena distribusi data di tail tipis.
// Inferensi dari Room.name menggunakan keyword-matching case-insensitive,
// fallback ke "A" (standar) bila tidak ada keyword yang cocok — sesuai
// modus distribusi `reserved_room_type` di dataset Antonio et al.
// ---------------------------------------------------------------------------
const ROOM_KEYWORDS: { keyword: string; code: RoomType }[] = [
  { keyword: "suite", code: "G" },
  { keyword: "family", code: "F" },
  { keyword: "deluxe", code: "D" },
  { keyword: "executive", code: "E" },
  { keyword: "superior", code: "B" },
  { keyword: "standard", code: "A" },
  { keyword: "twin", code: "B" },
  { keyword: "double", code: "B" },
  { keyword: "single", code: "A" },
];

export function inferRoomCode(name: string): RoomType {
  const lower = name.toLowerCase();
  for (const { keyword, code } of ROOM_KEYWORDS) {
    if (lower.includes(keyword)) return code;
  }
  return "A";
}

// Kontrak data Room dari Postgres yang dibutuhkan form & layer kalibrasi.
export interface RoomLite {
  id: string;
  name: string;
  price: number; // IDR
}

const MONTH_NAMES: ArrivalMonth[] = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ---------------------------------------------------------------------------
// State form yang ringkas.
// ---------------------------------------------------------------------------
interface FormState {
  hotel: HotelType | "";
  check_in: string; // ISO yyyy-mm-dd
  check_out: string; // ISO yyyy-mm-dd
  roomId: string; // Room.id dari Postgres
  adults: number;
  children: number;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const tomorrowISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const DEFAULT_STATE: FormState = {
  hotel: "",
  check_in: "",
  check_out: "",
  roomId: "",
  adults: 2,
  children: 0,
};

type Errors = Partial<Record<keyof FormState, string>>;

interface PredictionFormProps {
  rooms: RoomLite[];
  isPending: boolean;
  serverFieldErrors?: Record<string, string>;
  onSubmit: (
    input: BookingInput,
    derived: DerivedFeatures,
    room: RoomLite,
  ) => void;
}

// Untuk transparansi di UI: derived features dikirim balik ke parent agar
// bisa ditampilkan di panel "Detail teknis dikirim ke model".
export interface DerivedFeatures {
  lead_time: number;
  total_nights: number;
  weekend_nights: number;
  week_nights: number;
  arrival_date_year: number;
  arrival_date_month: ArrivalMonth;
  arrival_date_week_number: number;
  arrival_date_day_of_month: number;
  reserved_room_type: RoomType;
}

const inputClass =
  "bg-gray-100 p-3 border border-gray-200 rounded-md w-full font-light focus:outline-none focus:ring-2 focus:ring-orange-300 focus:bg-white transition-colors disabled:opacity-60";

const labelClass = "text-sm font-medium text-gray-700 mb-1 block";

const PredictionForm: FC<PredictionFormProps> = ({
  rooms,
  isPending,
  serverFieldErrors,
  onSubmit,
}) => {
  const [form, setForm] = useState<FormState>(DEFAULT_STATE);
  const [errors, setErrors] = useState<Errors>({});

  const mergedErrors = useMemo<Errors>(() => {
    if (!serverFieldErrors) return errors;
    return { ...errors, ...serverFieldErrors } as Errors;
  }, [errors, serverFieldErrors]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validate = (s: FormState): Errors => {
    const e: Errors = {};
    if (!s.hotel) e.hotel = "Pilih jenis hotel.";
    if (!s.roomId) e.roomId = "Pilih tipe kamar.";

    if (!s.check_in) e.check_in = "Pilih tanggal check-in.";
    if (!s.check_out) e.check_out = "Pilih tanggal check-out.";

    if (s.check_in && s.check_out) {
      const ci = new Date(s.check_in);
      const co = new Date(s.check_out);
      if (Number.isNaN(ci.getTime())) e.check_in = "Tanggal tidak valid.";
      if (Number.isNaN(co.getTime())) e.check_out = "Tanggal tidak valid.";
      if (!e.check_in && !e.check_out && co <= ci) {
        e.check_out = "Check-out harus setelah check-in.";
      }
      const todayMid = new Date();
      todayMid.setHours(0, 0, 0, 0);
      if (!e.check_in && ci < todayMid) {
        e.check_in = "Check-in tidak boleh di masa lalu.";
      }
    }

    if (!Number.isInteger(s.adults) || s.adults < 1) {
      e.adults = "Minimal 1 dewasa.";
    }
    if (!Number.isInteger(s.children) || s.children < 0) {
      e.children = "Minimal 0.";
    }
    return e;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const ci = new Date(form.check_in);
    const co = new Date(form.check_out);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // lead_time: hari antara hari ini dan check-in.
    const lead_time = Math.max(
      0,
      Math.round((ci.getTime() - today.getTime()) / 86_400_000),
    );

    // Klasifikasi tiap malam: malam yang dimulai pada Sat/Sun = weekend night.
    const totalNights = Math.max(
      1,
      Math.round((co.getTime() - ci.getTime()) / 86_400_000),
    );
    let weekendNights = 0;
    let weekNights = 0;
    for (let i = 0; i < totalNights; i++) {
      const d = new Date(ci);
      d.setDate(d.getDate() + i);
      const dow = d.getDay(); // 0=Sun, 6=Sat
      if (dow === 0 || dow === 6) weekendNights += 1;
      else weekNights += 1;
    }

    const month = MONTH_NAMES[ci.getMonth()];
    const week = isoWeekNumber(ci);
    const selectedRoom = rooms.find((r) => r.id === form.roomId);
    if (!selectedRoom) {
      setErrors((prev) => ({ ...prev, roomId: "Pilih tipe kamar." }));
      return;
    }
    const roomCode = inferRoomCode(selectedRoom.name);

    const derived: DerivedFeatures = {
      lead_time,
      total_nights: totalNights,
      weekend_nights: weekendNights,
      week_nights: weekNights,
      arrival_date_year: ci.getFullYear(),
      arrival_date_month: month,
      arrival_date_week_number: week,
      arrival_date_day_of_month: ci.getDate(),
      reserved_room_type: roomCode,
    };

    const payload: BookingInput = {
      // Input pengguna langsung
      hotel: form.hotel as HotelType,
      adults: form.adults,
      children: form.children,
      reserved_room_type: roomCode,
      assigned_room_type: roomCode,

      // Derived dari tanggal
      lead_time,
      arrival_date_year: derived.arrival_date_year,
      arrival_date_month: derived.arrival_date_month,
      arrival_date_week_number: derived.arrival_date_week_number,
      arrival_date_day_of_month: derived.arrival_date_day_of_month,
      stays_in_weekend_nights: weekendNights,
      stays_in_week_nights: weekNights,

      // Default representatif dataset Antonio et al.
      babies: 0,
      meal: "BB",
      country: "IDN", // tak ada di training -> fallback "Unknown" via encoder
      market_segment: "Online TA",
      distribution_channel: "TA/TO",
      is_repeated_guest: 0,
      previous_cancellations: 0,
      previous_bookings_not_canceled: 0,
      booking_changes: 0,
      deposit_type: "No Deposit",
      agent: 0,
      company: 0,
      days_in_waiting_list: 0,
      customer_type: "Transient",
      required_car_parking_spaces: 0,
      total_of_special_requests: 0,
    };

    onSubmit(payload, derived, selectedRoom);
  };

  const minCheckIn = todayISO();
  const minCheckOut = form.check_in
    ? addDaysISO(form.check_in, 1)
    : tomorrowISO();

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <Section title="Detail pemesanan">
        <Field label="Jenis hotel" error={mergedErrors.hotel} fullWidth>
          <select
            className={inputClass}
            value={form.hotel}
            onChange={(e) => update("hotel", e.target.value as HotelType)}
            disabled={isPending}
          >
            <option value="">Pilih jenis hotel (City Hotel / Resort Hotel)</option>
            <option value="City Hotel">City Hotel</option>
            <option value="Resort Hotel">Resort Hotel</option>
          </select>
        </Field>

        <Field label="Tanggal check-in" error={mergedErrors.check_in}>
          <input
            type="date"
            className={inputClass}
            value={form.check_in}
            min={minCheckIn}
            onChange={(e) => update("check_in", e.target.value)}
            disabled={isPending}
          />
        </Field>

        <Field label="Tanggal check-out" error={mergedErrors.check_out}>
          <input
            type="date"
            className={inputClass}
            value={form.check_out}
            min={minCheckOut}
            onChange={(e) => update("check_out", e.target.value)}
            disabled={isPending}
          />
        </Field>

        <Field
          label="Tipe kamar"
          error={mergedErrors.roomId}
          hint={
            rooms.length === 0
              ? "Tidak ada kamar di basis data. Tambahkan kamar di /admin terlebih dahulu."
              : "Harga base diambil langsung dari basis data hotel."
          }
          fullWidth
        >
          <select
            className={inputClass}
            value={form.roomId}
            onChange={(e) => update("roomId", e.target.value)}
            disabled={isPending || rooms.length === 0}
          >
            <option value="">
              {rooms.length === 0
                ? "— belum ada kamar —"
                : "Pilih tipe kamar"}
            </option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} — {formatRupiah(r.price)} / malam
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Jumlah tamu">
        <Field label="Dewasa" error={mergedErrors.adults}>
          <select
            className={inputClass}
            value={form.adults}
            onChange={(e) => update("adults", Number(e.target.value))}
            disabled={isPending}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} dewasa
              </option>
            ))}
          </select>
        </Field>

        <Field label="Anak-anak" error={mergedErrors.children}>
          <select
            className={inputClass}
            value={form.children}
            onChange={(e) => update("children", Number(e.target.value))}
            disabled={isPending}
          >
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} anak
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <button
        type="submit"
        disabled={isPending}
        className={clsx(
          "w-full py-4 rounded-md font-semibold text-white text-base shadow-sm transition-colors cursor-pointer",
          "bg-orange-600 hover:bg-orange-700 active:bg-orange-800",
          "disabled:opacity-60 disabled:cursor-progress",
          { "animate-pulse": isPending },
        )}
      >
        {isPending ? "Menghitung..." : "Hitung estimasi harga"}
      </button>
    </form>
  );
};

const Field: FC<{
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}> = ({ label, children, error, hint, fullWidth }) => (
  <div className={fullWidth ? "sm:col-span-2" : undefined}>
    <label className={labelClass}>{label}</label>
    {children}
    {hint && !error ? (
      <p className="text-xs text-gray-400 mt-1">{hint}</p>
    ) : null}
    {error ? <p className="text-xs text-red-500 mt-1">{error}</p> : null}
  </div>
);

const Section: FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <fieldset className="border-t border-gray-200 pt-6">
    <legend className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-4">
      {title}
    </legend>
    <div className="grid sm:grid-cols-2 gap-5">{children}</div>
  </fieldset>
);

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

// ISO 8601 week number (Monday-based).
function isoWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7; // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default PredictionForm;
