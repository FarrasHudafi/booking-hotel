"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PredictionForm, {
  DerivedFeatures,
  RoomLite,
} from "@/components/PredictionForm";
import PredictionResult from "@/components/PredictionResult";
import {
  BookingInput,
  MLApiError,
  PredictionResponse,
  checkHealth,
  predictPrice,
} from "@/lib/ml-client";
import {
  CalibrationOutput,
  MAX_MULTIPLIER,
  MIN_MULTIPLIER,
  Season,
  calibrate,
  classifySeason,
} from "@/lib/calibration";

type Toast = {
  id: number;
  type: "error" | "info" | "success";
  message: string;
};

type BackendStatus =
  | { kind: "checking" }
  | { kind: "ok" }
  | { kind: "degraded"; message: string }
  | { kind: "down"; message: string };

interface PredictClientProps {
  rooms: RoomLite[];
}

export default function PredictClient({ rooms }: PredictClientProps) {
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [calibration, setCalibration] = useState<CalibrationOutput | null>(
    null,
  );
  const [season, setSeason] = useState<Season | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomLite | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [serverFieldErrors, setServerFieldErrors] = useState<
    Record<string, string> | undefined
  >(undefined);
  const [backend, setBackend] = useState<BackendStatus>({ kind: "checking" });
  const [lastSubmitted, setLastSubmitted] = useState<{
    input: BookingInput;
    derived: DerivedFeatures;
  } | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const pushToast = useCallback(
    (type: Toast["type"], message: string) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, type, message }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    checkHealth()
      .then((res) => {
        if (cancelled) return;
        if (res.model_loaded && res.status === "ok") {
          setBackend({ kind: "ok" });
        } else {
          setBackend({
            kind: "degraded",
            message:
              "Backend menjawab tetapi model belum siap. Prediksi mungkin gagal.",
          });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof MLApiError
            ? err.message
            : "Tidak dapat menghubungi server prediksi.";
        setBackend({ kind: "down", message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = useCallback(
    async (
      input: BookingInput,
      derived: DerivedFeatures,
      room: RoomLite,
    ) => {
      setIsPending(true);
      setServerFieldErrors(undefined);
      setLastSubmitted({ input, derived });
      setSelectedRoom(room);
      try {
        const response = await predictPrice(input);
        const calib = calibrate({
          predictedEur: response.predicted_adr,
          basePriceIdr: room.price,
          frisatNights: derived.frisat_nights,
          totalNights: derived.total_nights,
        });
        setResult(response);
        setCalibration(calib);
        setSeason(classifySeason(derived.arrival_date_month));
        pushToast("success", "Prediksi berhasil dihitung.");
        requestAnimationFrame(() => {
          resultRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      } catch (err) {
        if (err instanceof MLApiError) {
          if (err.fieldErrors) setServerFieldErrors(err.fieldErrors);
          pushToast("error", err.message);
        } else {
          pushToast(
            "error",
            "Terjadi kesalahan tak terduga saat memanggil server prediksi.",
          );
        }
      } finally {
        setIsPending(false);
      }
    },
    [pushToast],
  );

  const handleReset = useCallback(() => {
    setResult(null);
    setCalibration(null);
    setSeason(null);
    setSelectedRoom(null);
    setServerFieldErrors(undefined);
    setLastSubmitted(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <header className="rounded-t-lg bg-blue-700 text-white text-center px-6 py-5 shadow-sm">
          <h1 className="text-xl sm:text-2xl font-bold">
            Sistem Prediksi Harga Booking Hotel
          </h1>
          <p className="text-blue-100 text-sm mt-1">
            Resort Hotel · estimasi harga kamar berdasarkan tanggal dan tipe
            kamar
          </p>
        </header>

        <BackendBanner status={backend} />

        <section className="bg-white rounded-b-lg shadow-sm border border-t-0 border-gray-200 px-6 py-8 sm:px-10">
          <PredictionForm
            rooms={rooms}
            isPending={isPending || backend.kind === "down"}
            serverFieldErrors={serverFieldErrors}
            onSubmit={handleSubmit}
          />
        </section>

        <div ref={resultRef} className="mt-8">
          {result && calibration && selectedRoom ? (
            <>
              <PredictionResult
                result={result}
                calibration={calibration}
                season={season}
                room={selectedRoom}
                onReset={handleReset}
              />
              {lastSubmitted ? (
                <TechnicalDetails
                  input={lastSubmitted.input}
                  derived={lastSubmitted.derived}
                  calibration={calibration}
                />
              ) : null}
            </>
          ) : (
            <div className="rounded-lg overflow-hidden shadow-sm">
              <div className="bg-emerald-700 text-white text-center px-6 py-4">
                <p className="text-base font-semibold">
                  Estimasi harga per malam
                </p>
                <p className="text-emerald-100 text-sm mt-1">
                  Hasil prediksi akan muncul di sini setelah tombol ditekan
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ToastStack toasts={toasts} />
    </div>
  );
}

function BackendBanner({ status }: { status: BackendStatus }) {
  if (status.kind === "ok") return null;

  const tone =
    status.kind === "checking"
      ? "bg-gray-100 text-gray-700 border-gray-200"
      : status.kind === "degraded"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : "bg-red-50 text-red-900 border-red-200";

  const text =
    status.kind === "checking"
      ? "Memeriksa ketersediaan server prediksi..."
      : status.message;

  return (
    <div
      role="status"
      className={`text-sm border-x border-b px-6 py-3 ${tone}`}
    >
      {text}
    </div>
  );
}

function TechnicalDetails({
  input,
  derived,
  calibration,
}: {
  input: BookingInput;
  derived: DerivedFeatures;
  calibration: CalibrationOutput;
}) {
  return (
    <details className="mt-4 rounded-lg border border-gray-200 bg-white text-sm">
      <summary className="cursor-pointer px-5 py-3 font-medium text-gray-700 hover:bg-gray-50 select-none">
        Detail teknis dikirim ke model
      </summary>

      <div className="px-5 py-4 border-t border-gray-200 space-y-5 text-gray-700">
        <p className="text-xs text-gray-500">
          Form ringkas di atas hanya meminta 6 input. Sistem menurunkan 7
          fitur tambahan dari tanggal &amp; tipe kamar, mengisi 15 fitur lain
          dengan default representatif dataset Antonio et al. (2019), lalu
          mengkalibrasi prediksi EUR ke skala harga Rupiah memakai harga base
          dari basis data hotel.
        </p>

        {calibration.clamped ? (
          <div className="rounded-md bg-sky-50 border border-sky-200 p-3 text-xs text-sky-900 space-y-1">
            <p className="font-semibold">
              Penyesuaian out-of-distribution diterapkan:
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>
                Multiplier mentah{" "}
                <span className="font-semibold">
                  {calibration.rawMultiplier.toFixed(2)}×
                </span>{" "}
                di-clamp ke{" "}
                <span className="font-semibold">
                  {calibration.multiplier.toFixed(2)}×
                </span>{" "}
                (batas{" "}
                {calibration.clamped === "low"
                  ? `bawah ${MIN_MULTIPLIER}×`
                  : `atas ${MAX_MULTIPLIER}×`}
                ). Sinyal bahwa kombinasi fitur input berada di tepi
                distribusi training — clamp meredam outlier prediksi.
              </li>
            </ul>
          </div>
        ) : null}

        <div>
          <h4 className="font-semibold text-gray-800 mb-2">
            Diturunkan dari input pengguna
          </h4>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            <Row label="Lead time" value={`${derived.lead_time} hari`} />
            <Row
              label="Total malam"
              value={`${derived.total_nights} malam`}
            />
            <Row
              label="Malam akhir pekan"
              value={`${derived.weekend_nights}`}
            />
            <Row label="Malam hari kerja" value={`${derived.week_nights}`} />
            <Row
              label="Bulan kedatangan"
              value={derived.arrival_date_month}
            />
            <Row
              label="Minggu / tanggal"
              value={`W${derived.arrival_date_week_number} · ${derived.arrival_date_day_of_month}`}
            />
            <Row
              label="Tahun kedatangan"
              value={`${derived.arrival_date_year}`}
            />
            <Row
              label="Reserved room (kode)"
              value={derived.reserved_room_type}
            />
          </dl>
        </div>

        <div>
          <h4 className="font-semibold text-gray-800 mb-2">
            Default representatif dataset
          </h4>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            <Row label="Meal" value={input.meal} />
            <Row label="Country" value={`${input.country} → Unknown`} />
            <Row label="Market segment" value={input.market_segment} />
            <Row
              label="Distribution channel"
              value={input.distribution_channel}
            />
            <Row label="Customer type" value={input.customer_type} />
            <Row label="Deposit type" value={input.deposit_type} />
            <Row
              label="Repeated guest"
              value={input.is_repeated_guest === 1 ? "Ya" : "Tidak"}
            />
            <Row label="Bayi" value={`${input.babies}`} />
            <Row
              label="Booking changes"
              value={`${input.booking_changes}`}
            />
            <Row
              label="Permintaan parkir"
              value={`${input.required_car_parking_spaces}`}
            />
            <Row
              label="Permintaan khusus"
              value={`${input.total_of_special_requests}`}
            />
          </dl>
        </div>

        <div>
          <h4 className="font-semibold text-gray-800 mb-2">Kalibrasi harga</h4>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            <Row
              label="Mean ADR dataset"
              value={`€${calibration.datasetMeanEur.toFixed(2)}`}
            />
            <Row
              label="Prediksi model (EUR)"
              value={`€${calibration.predictedEur.toFixed(2)}`}
            />
            <Row
              label="Raw multiplier (Antonio)"
              value={`${calibration.rawMultiplier.toFixed(4)}×`}
            />
            <Row
              label="Weekend uplift (ID)"
              value={`${calibration.weekendUplift.toFixed(4)}× — ${calibration.frisatNights}/${calibration.totalNights} malam Jum/Sab`}
            />
            <Row
              label="Multiplier (final)"
              value={`${calibration.multiplier.toFixed(4)}× (Δ ${calibration.deltaPct >= 0 ? "+" : ""}${calibration.deltaPct.toFixed(1)}%)${calibration.clamped ? ` · clamp ${calibration.clamped}` : ""}`}
            />
            <Row
              label="Base price (DB)"
              value={formatRupiah(calibration.basePriceIdr)}
            />
          </dl>
          <p className="text-[11px] text-gray-500 mt-2">
            Rumus:{" "}
            <code className="bg-gray-100 px-1 rounded">
              IDR = base × clamp((eur ÷ mean) × (1 + 0.05 × frisat/total),{" "}
              {MIN_MULTIPLIER}, {MAX_MULTIPLIER})
            </code>
            <br />
            Lapisan weekend uplift dikalibrasi dari koefisien{" "}
            <code className="bg-gray-100 px-1 rounded">isFriSat</code> di
            sistem dynamic-pricing lokal (~+5–6% per malam Jum/Sab).
          </p>
        </div>
      </div>
    </details>
  );
}

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-800 truncate">{value}</dd>
    </>
  );
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-md shadow-lg px-4 py-3 text-sm border ${
            t.type === "error"
              ? "bg-red-50 text-red-900 border-red-200"
              : t.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : "bg-blue-50 text-blue-900 border-blue-200"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
