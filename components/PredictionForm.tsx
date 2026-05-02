"use client";

import { FC, FormEvent, useMemo, useState } from "react";
import { clsx } from "clsx";
import { BookingRequest, RoomType } from "@/lib/ml-client";

// ---------------------------------------------------------------------------
// Pemetaan nama kamar dari basis data ke kategori RoomType pada dataset
// dynamic_pricing lokal. Pencocokan keyword case-insensitive; fallback ke
// "Standard" jika tidak ada keyword yang cocok.
// ---------------------------------------------------------------------------
const ROOM_KEYWORDS: { keyword: string; type: RoomType }[] = [
  { keyword: "suite", type: "Suite" },
  { keyword: "deluxe", type: "Deluxe" },
  { keyword: "executive", type: "Deluxe" },
  { keyword: "superior", type: "Superior" },
  { keyword: "twin", type: "Superior" },
  { keyword: "double", type: "Superior" },
  { keyword: "standard", type: "Standard" },
  { keyword: "single", type: "Standard" },
];

export function inferRoomType(name: string): RoomType {
  const lower = name.toLowerCase();
  for (const { keyword, type } of ROOM_KEYWORDS) {
    if (lower.includes(keyword)) return type;
  }
  return "Standard";
}

export interface RoomLite {
  id: string;
  name: string;
  price: number;
  capacity: number;
}

interface FormState {
  check_in: string;
  check_out: string;
  roomId: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const tomorrowISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const DEFAULT_STATE: FormState = {
  check_in: "",
  check_out: "",
  roomId: "",
};

type Errors = Partial<Record<keyof FormState, string>>;

interface PredictionFormProps {
  rooms: RoomLite[];
  isPending: boolean;
  serverFieldErrors?: Record<string, string>;
  onSubmit: (input: BookingRequest, room: RoomLite) => void;
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
    return e;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const selectedRoom = rooms.find((r) => r.id === form.roomId);
    if (!selectedRoom) {
      setErrors((prev) => ({ ...prev, roomId: "Pilih tipe kamar." }));
      return;
    }

    const payload: BookingRequest = {
      check_in: form.check_in,
      check_out: form.check_out,
      room_type: inferRoomType(selectedRoom.name),
      base_price: selectedRoom.price,
      total_guests: Math.max(1, selectedRoom.capacity),
      segment: "Leisure",
      channel: "Website",
    };

    onSubmit(payload, selectedRoom);
  };

  const minCheckIn = todayISO();
  const minCheckOut = form.check_in
    ? addDaysISO(form.check_in, 1)
    : tomorrowISO();

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-2 text-xs text-blue-900">
        Estimasi harga dihitung dari model{" "}
        <span className="font-semibold">Ridge Regression</span> yang dilatih
        pada riwayat reservasi hotel lokal.
      </div>

      <Section title="Detail pemesanan">
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
              : "Harga base & jumlah tamu diambil dari basis data hotel."
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
                {r.name} — {formatRupiah(r.price)} / malam · maks {r.capacity}{" "}
                tamu
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

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default PredictionForm;
