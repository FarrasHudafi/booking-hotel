import { getRoomReviewsForRoom } from "@/lib/data";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import Image from "next/image";
import { IoStar, IoStarOutline } from "react-icons/io5";

function reviewerLabel(user: {
  name: string | null;
  email: string | null;
}) {
  const n = user.name?.trim();
  if (n) return n;
  const email = user.email;
  if (email) return email.split("@")[0];
  return "Pengguna";
}

export default async function RoomReviewsSection({
  roomId,
}: {
  roomId: string;
}) {
  const reviews = await getRoomReviewsForRoom(roomId);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
      <div className="flex items-center gap-2 mb-2">
        <IoStarOutline className="size-6 text-yellow-500" />
        <h2 className="text-xl font-bold text-gray-900">Ulasan tamu</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Pengalaman tamu yang sudah menginap. Untuk menulis ulasan, buka{" "}
        <strong>Reservasi saya</strong> setelah pembayaran lunas dan masa
        menginap selesai.
      </p>

      {reviews.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          Belum ada ulasan untuk kamar ini.
        </p>
      ) : (
        <ul className="space-y-6">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="flex gap-4 pb-6 border-b border-gray-50 last:border-0 last:pb-0"
            >
              <div className="relative size-11 shrink-0 rounded-full bg-gray-100 overflow-hidden">
                {r.User.image ? (
                  <Image
                    src={r.User.image}
                    alt=""
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500">
                    {reviewerLabel(r.User).slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 gap-y-1">
                  <span className="font-semibold text-gray-900">
                    {reviewerLabel(r.User)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {format(r.createdAt, "d MMMM yyyy", { locale: localeId })}
                  </span>
                </div>
                <div className="flex gap-0.5 mt-1 mb-2" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) =>
                    i < r.rating ? (
                      <IoStar
                        key={i}
                        className="size-4 text-yellow-400 fill-yellow-400"
                      />
                    ) : (
                      <IoStarOutline
                        key={i}
                        className="size-4 text-gray-300"
                      />
                    ),
                  )}
                </div>
                {r.comment ? (
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {r.comment}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
