"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PredictionForm, { RoomLite } from "@/components/PredictionForm";
import PredictionResult from "@/components/PredictionResult";
import {
  BookingRequest,
  MLApiError,
  PredictionResponse,
  checkHealth,
  predictPrice,
} from "@/lib/ml-client";

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
  const [selectedRoom, setSelectedRoom] = useState<RoomLite | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [serverFieldErrors, setServerFieldErrors] = useState<
    Record<string, string> | undefined
  >(undefined);
  const [backend, setBackend] = useState<BackendStatus>({ kind: "checking" });
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
    async (input: BookingRequest, room: RoomLite) => {
      setIsPending(true);
      setServerFieldErrors(undefined);
      setSelectedRoom(room);
      try {
        const response = await predictPrice(input);
        setResult(response);
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
    setSelectedRoom(null);
    setServerFieldErrors(undefined);
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
            Estimasi harga kamar berbasis Ridge Regression dari riwayat
            reservasi
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
          {result && selectedRoom ? (
            <PredictionResult
              result={result}
              room={selectedRoom}
              onReset={handleReset}
            />
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
