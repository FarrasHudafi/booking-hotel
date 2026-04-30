"use client";

import { FC } from "react";
import { PredictionResponse } from "@/lib/ml-client";
import { CalibrationOutput, Season } from "@/lib/calibration";
import type { RoomLite } from "@/components/PredictionForm";

interface PredictionResultProps {
  result: PredictionResponse;
  calibration: CalibrationOutput;
  season: Season | null;
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

const formatEUR = (valueEur: number) => {
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(valueEur);
  } catch {
    return `€${valueEur.toFixed(2)}`;
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

const SEASON_LABEL: Record<Season, string> = {
  low: "Low season",
  mid: "Mid season",
  high: "High season",
};

const SEASON_TONE: Record<Season, string> = {
  low: "bg-sky-100 text-sky-800 border-sky-200",
  mid: "bg-gray-100 text-gray-800 border-gray-200",
  high: "bg-amber-100 text-amber-800 border-amber-200",
};

const PredictionResult: FC<PredictionResultProps> = ({
  result,
  calibration,
  season,
  room,
  onReset,
}) => {
  const { predictedIdr, basePriceIdr, multiplier, deltaPct } = calibration;
  const deltaSign = deltaPct >= 0 ? "+" : "";

  return (
    <div className="prediction-result rounded-lg border border-emerald-200 bg-linear-to-br from-emerald-50 to-emerald-100 shadow-sm overflow-hidden">
      <div className="bg-emerald-700 text-white px-6 py-4">
        <h2 className="text-lg font-semibold">Hasil prediksi</h2>
        <p className="text-emerald-100 text-sm">
          {room.name} · estimasi ADR per malam berdasarkan kalibrasi model ke
          harga base hotel
        </p>
      </div>

      <div className="p-6 space-y-6">
        <div className="text-center">
          <p className="text-sm uppercase tracking-wider text-emerald-700 font-medium">
            Estimasi harga per malam
          </p>
          <p className="text-4xl sm:text-5xl lg:text-6xl font-bold text-emerald-900 mt-2 tabular-nums wrap-break-word">
            {formatIDR(predictedIdr)}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 border border-emerald-200 px-3 py-1 text-emerald-800">
              Base price{" "}
              <span className="font-semibold">{formatIDR(basePriceIdr)}</span>
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 ${
                deltaPct > 5
                  ? "bg-amber-100 text-amber-900 border-amber-200"
                  : deltaPct < -5
                    ? "bg-sky-100 text-sky-900 border-sky-200"
                    : "bg-gray-100 text-gray-800 border-gray-200"
              }`}
            >
              {multiplier.toFixed(2)}× ({deltaSign}
              {deltaPct.toFixed(1)}%)
            </span>
            {season ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 ${SEASON_TONE[season]}`}
              >
                {SEASON_LABEL[season]}
              </span>
            ) : null}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm border-t border-emerald-200 pt-4">
          <div>
            <dt className="text-emerald-700">Prediksi model (EUR)</dt>
            <dd className="font-semibold text-emerald-900">
              {formatEUR(result.predicted_adr)}
            </dd>
          </div>
          <div>
            <dt className="text-emerald-700">Versi model</dt>
            <dd className="font-semibold text-emerald-900">
              {result.model_version}
            </dd>
          </div>
          <div>
            <dt className="text-emerald-700">Mean ADR dataset</dt>
            <dd className="font-semibold text-emerald-900">
              {formatEUR(calibration.datasetMeanEur)}
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
          dataset Hotel Booking Demand (Antonio et al., 2019, EUR), lalu
          dikalibrasi ke skala Rupiah memakai harga base{" "}
          <span className="font-semibold">{room.name}</span> dari basis data.
          Harga aktual dapat berbeda tergantung kebijakan hotel, ketersediaan,
          dan faktor lain di luar fitur model.
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
