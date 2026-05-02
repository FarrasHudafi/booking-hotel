"use client";

import { FC } from "react";
import { PredictionResponse } from "@/lib/ml-client";
import type { RoomLite } from "@/components/PredictionForm";

interface PredictionResultProps {
  result: PredictionResponse;
  room: RoomLite;
  onReset: () => void;
}

const formatIDR = (valueIdr: number) => {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(valueIdr);
  } catch {
    return `Rp${Math.round(valueIdr).toLocaleString("id-ID")}`;
  }
};

const formatTimestamp = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const PredictionResult: FC<PredictionResultProps> = ({
  result,
  room,
  onReset,
}) => {
  const {
    predicted_price,
    base_price,
    raw_price_ratio,
    clamped_price_ratio,
    delta_pct,
    night_date,
    lead_time_days,
    length_of_stay,
    occupancy_rate_used,
  } = result;
  const wasClamped = Math.abs(raw_price_ratio - clamped_price_ratio) > 1e-6;
  const deltaSign = delta_pct >= 0 ? "+" : "";

  return (
    <div className="prediction-result rounded-lg border border-emerald-200 bg-linear-to-br from-emerald-50 to-emerald-100 shadow-sm overflow-hidden">
      <div className="bg-emerald-700 text-white px-6 py-4">
        <h2 className="text-lg font-semibold">Hasil prediksi</h2>
        <p className="text-emerald-100 text-sm">
          {room.name} · estimasi harga per malam menurut model Ridge Regression
        </p>
      </div>

      <div className="p-6 space-y-6">
        <div className="text-center">
          <p className="text-sm uppercase tracking-wider text-emerald-700 font-medium">
            Estimasi harga per malam
          </p>
          <p className="text-4xl sm:text-5xl lg:text-6xl font-bold text-emerald-900 mt-2 tabular-nums wrap-break-word">
            {formatIDR(predicted_price)}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 border border-emerald-200 px-3 py-1 text-emerald-800">
              Base price{" "}
              <span className="font-semibold">{formatIDR(base_price)}</span>
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 ${
                delta_pct > 5
                  ? "bg-amber-100 text-amber-900 border-amber-200"
                  : delta_pct < -5
                    ? "bg-sky-100 text-sky-900 border-sky-200"
                    : "bg-gray-100 text-gray-800 border-gray-200"
              }`}
            >
              {clamped_price_ratio.toFixed(2)}× ({deltaSign}
              {delta_pct.toFixed(1)}%)
            </span>
            {wasClamped ? (
              <span
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1 bg-purple-100 text-purple-900 border-purple-200"
                title={`Multiplier mentah ${raw_price_ratio.toFixed(2)}× di-clamp ke ${clamped_price_ratio.toFixed(2)}×`}
              >
                Clamped
              </span>
            ) : null}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm border-t border-emerald-200 pt-4">
          <div>
            <dt className="text-emerald-700">Tanggal check-in</dt>
            <dd className="font-semibold text-emerald-900">{night_date}</dd>
          </div>
          <div>
            <dt className="text-emerald-700">Lama menginap</dt>
            <dd className="font-semibold text-emerald-900">
              {length_of_stay} malam
            </dd>
          </div>
          <div>
            <dt className="text-emerald-700">Lead time</dt>
            <dd className="font-semibold text-emerald-900">
              {lead_time_days} hari
            </dd>
          </div>
          <div>
            <dt className="text-emerald-700">Estimasi occupancy</dt>
            <dd className="font-semibold text-emerald-900">
              {(occupancy_rate_used * 100).toFixed(0)}%
            </dd>
          </div>
          <div>
            <dt className="text-emerald-700">Versi model</dt>
            <dd className="font-semibold text-emerald-900">
              {result.model_version}
            </dd>
          </div>
          <div>
            <dt className="text-emerald-700">Status</dt>
            <dd className="font-semibold text-emerald-900 capitalize">
              {result.status}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-emerald-700">Waktu prediksi</dt>
            <dd className="font-semibold text-emerald-900">
              {formatTimestamp(result.timestamp)}
            </dd>
          </div>
        </dl>

        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          <strong className="font-semibold">Disclaimer:</strong> nilai di atas
          adalah estimasi statistik. Model Ridge Regression dilatih pada
          riwayat reservasi hotel lokal. Harga aktual dapat berbeda
          tergantung kebijakan hotel, ketersediaan, dan faktor lain di luar
          fitur model.
        </div>

        <button
          type="button"
          onClick={onReset}
          className="w-full py-3 rounded-md font-semibold text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-50 transition-colors cursor-pointer"
        >
          Prediksi ulang
        </button>
      </div>
    </div>
  );
};

export default PredictionResult;
