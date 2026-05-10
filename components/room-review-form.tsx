"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitRoomReview } from "@/lib/action";
import clsx from "clsx";
import { IoStar } from "react-icons/io5";

type FormState =
  | {
      message?: string;
      error?: {
        rating?: string[];
        comment?: string[];
        _form?: string[];
      };
    }
  | null;

/** Form kirim ulasan sekali per reservasi (hanya dipasang jika server mengizinkan). */
export default function RoomReviewForm({
  reservationId,
  roomId,
  signedIn,
  signInRedirectPath,
}: {
  reservationId: string;
  roomId: string;
  signedIn: boolean;
  signInRedirectPath?: string;
}) {
  const [rating, setRating] = useState(0);
  const redirectPath = signInRedirectPath ?? `/myreservation/${reservationId}/review`;
  const [state, formAction, isPending] = useActionState(
    submitRoomReview.bind(null, reservationId),
    null as FormState,
  );

  if (!signedIn) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-5 text-center">
        <p className="text-sm text-gray-600 mb-3">
          Masuk untuk menulis ulasan.
        </p>
        <Link
          href={`/signin?redirect_url=${encodeURIComponent(redirectPath)}`}
          className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
        >
          Masuk dengan Google
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <span className="block text-sm font-medium text-gray-800 mb-2">
          Rating
        </span>
        <div className="flex items-center gap-1" role="group" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className="p-1 rounded-md hover:bg-yellow-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              aria-label={`${n} bintang`}
            >
              <IoStar
                className={clsx(
                  "size-8 transition-colors",
                  n <= rating
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-300",
                )}
              />
            </button>
          ))}
        </div>
        <input type="hidden" name="rating" value={rating} />
        {state?.error?.rating?.[0] ? (
          <p className="mt-1 text-xs text-red-600">{state.error.rating[0]}</p>
        ) : rating === 0 ? (
          <p className="mt-1 text-xs text-amber-700">
            Pilih jumlah bintang sebelum mengirim.
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor={`review-comment-${reservationId}`}
          className="block text-sm font-medium text-gray-800 mb-1"
        >
          Komentar{" "}
          <span className="font-normal text-gray-400">(opsional)</span>
        </label>
        <textarea
          id={`review-comment-${reservationId}`}
          name="comment"
          rows={4}
          maxLength={800}
          placeholder="Ceritakan pengalaman menginap Anda..."
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
        />
        {state?.error?.comment?.[0] ? (
          <p className="mt-1 text-xs text-red-600">{state.error.comment[0]}</p>
        ) : null}
      </div>

      {state?.error?._form?.[0] ? (
        <p className="text-sm text-red-600">{state.error._form[0]}</p>
      ) : null}
      {state?.message ? (
        <p className="text-sm font-medium text-green-700">{state.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || rating === 0}
        className="w-full sm:w-auto rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
      >
        {isPending ? "Mengirim..." : "Kirim ulasan"}
      </button>
    </form>
  );
}
