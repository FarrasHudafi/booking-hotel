import { auth } from "@/auth";
import { getReservationById, getReviewByReservationId } from "@/lib/data";
import RoomReviewForm from "@/components/room-review-form";
import ReviewSubmittedReadonly from "@/components/review-submitted-readonly";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Ulasan menginap",
};

export default async function ReservationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: reservationId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(
      `/signin?redirect_url=${encodeURIComponent(`/myreservation/${reservationId}/review`)}`,
    );
  }

  const reservation = await getReservationById(reservationId);
  if (!reservation) notFound();
  if (reservation.userId !== session.user.id) notFound();

  const roomId = reservation.roomId;
  const review = await getReviewByReservationId(reservationId);
  const paid =
    (reservation.Payment?.status ?? "").toLowerCase() === "paid";
  const checkoutPassed = reservation.endDate <= new Date();

  const signInPath = `/myreservation/${reservationId}/review`;

  let body: ReactNode;
  if (review) {
    body = <ReviewSubmittedReadonly rating={review.rating} comment={review.comment} />;
  } else if (!paid) {
    body = (
      <div className="rounded-xl border border-amber-100 bg-amber-50/90 p-5 space-y-3">
        <p className="text-sm text-gray-800 leading-relaxed">
          Ulasan tidak tersedia untuk reservasi <strong>pending</strong> atau{" "}
          <strong>gagal</strong>. Selesaikan pembayaran hingga status{" "}
          <strong>paid</strong> terlebih dahulu.
        </p>
        <Link
          href={`/myreservation/${reservationId}`}
          className="inline-flex text-sm font-semibold text-orange-600 hover:text-orange-700 underline-offset-2 hover:underline"
        >
          Lihat detail reservasi →
        </Link>
      </div>
    );
  } else if (!checkoutPassed) {
    body = (
      <div className="rounded-xl border border-amber-100 bg-amber-50/90 p-5 space-y-3">
        <p className="text-sm text-gray-800 leading-relaxed">
          Ulasan bisa dikirim <strong>satu kali</strong> setelah{" "}
          <strong>tanggal checkout</strong> reservasi ini lewat.
        </p>
        <Link
          href={`/myreservation/${reservationId}`}
          className="inline-flex text-sm font-semibold text-orange-600 hover:text-orange-700 underline-offset-2 hover:underline"
        >
          Lihat detail reservasi →
        </Link>
      </div>
    );
  } else {
    body = (
      <RoomReviewForm
        reservationId={reservationId}
        roomId={roomId}
        signedIn
        signInRedirectPath={signInPath}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto mt-10 py-12 px-4">
        <Link
          href="/myreservation"
          className="text-sm font-medium text-orange-600 hover:text-orange-700 mb-6 inline-block"
        >
          ← Kembali ke reservasi
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
          <p className="text-[10px] font-bold tracking-[0.15em] text-orange-400 uppercase mb-1">
            Ulasan menginap
          </p>
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            {reservation.Room.name}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Satu ulasan per pemesanan. Tampil di halaman kamar untuk tamu lain.
          </p>

          {body}

          <p className="mt-8 pt-6 border-t border-gray-100 text-center">
            <Link
              href={`/room/${roomId}`}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              Lihat halaman kamar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
