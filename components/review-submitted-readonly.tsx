import { IoStar, IoStarOutline } from "react-icons/io5";

export default function ReviewSubmittedReadonly({
  rating,
  comment,
}: {
  rating: number;
  comment: string | null;
}) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-5 space-y-3">
      <p className="text-sm font-semibold text-emerald-900">
        Ulasan Anda untuk reservasi ini
      </p>
      <div className="flex gap-0.5" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) =>
          i < rating ? (
            <IoStar
              key={i}
              className="size-6 text-yellow-400 fill-yellow-400"
            />
          ) : (
            <IoStarOutline key={i} className="size-6 text-gray-300" />
          ),
        )}
      </div>
      {comment ? (
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {comment}
        </p>
      ) : (
        <p className="text-xs text-gray-500 italic">Tanpa komentar teks</p>
      )}
    </div>
  );
}
