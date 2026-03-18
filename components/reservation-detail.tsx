import { getReservationById } from "@/lib/data";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { differenceInCalendarDays } from "date-fns";
import Link from "next/link";

const ReservationDetail = async ({
  reservationId,
}: {
  reservationId: string;
}) => {
  const reservation = await getReservationById(reservationId);
  if (!reservation) return notFound();

  const nights = differenceInCalendarDays(
    reservation.endDate,
    reservation.startDate
  );
  const status = (reservation.Payment?.status ?? "pending").toLowerCase();
  const isPaid = status === "paid";
  const isPending = status === "pending";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] text-orange-400 uppercase mb-0.5">
            Reservation
          </p>
          <p className="font-mono text-sm text-gray-500 truncate">
            #{reservation.id}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase ${
            isPaid
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isPaid ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          {reservation.Payment?.status ?? "Pending"}
        </span>
      </div>

      <div className="p-6 space-y-6">

        {/* Guest & Payment Info Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Guest Info */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold tracking-[0.15em] text-orange-400 uppercase mb-3">
              Guest Information
            </p>
            <InfoRow label="Book Date" value={formatDate(reservation.createdAt.toDateString())} />
            <InfoRow label="Name" value={reservation.User.name ?? "—"} />
            <InfoRow label="Email" value={reservation.User.email ?? "—"} />
            <InfoRow label="Phone" value={reservation.User.phone ?? "—"} />
          </div>

          {/* Payment Info */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold tracking-[0.15em] text-orange-400 uppercase mb-3">
              Payment Information
            </p>
            <InfoRow
              label="Method"
              value={
                reservation.Payment?.method
                  ? reservation.Payment.method.replace("_", " ")
                  : "—"
              }
              capitalize
            />
            <InfoRow
              label="Status"
              value={reservation.Payment?.status ?? "—"}
              capitalize
            />
            <InfoRow
              label="Amount"
              value={
                reservation.Payment
                  ? formatCurrency(reservation.Payment.amount)
                  : "—"
              }
            />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-200" />

        {/* Booking Summary Table */}
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] text-orange-400 uppercase mb-4">
            Booking Summary
          </p>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Room</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[120px]">Check-in</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[120px]">Check-out</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Sub Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-gray-900 whitespace-nowrap">
                      {reservation.Room.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatCurrency(reservation.Room.price)} / night
                    </p>
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    {formatDate(reservation.startDate.toISOString())}
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    {formatDate(reservation.endDate.toISOString())}
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    {nights} {nights === 1 ? "Night" : "Nights"}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-gray-900">
                    {reservation.Payment
                      ? formatCurrency(reservation.Payment.amount)
                      : "—"}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-100 bg-gray-50">
                  <td className="px-5 py-4" colSpan={4}>
                    <span className="text-xs font-bold tracking-[0.15em] text-gray-500 uppercase">
                      Total
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-lg font-extrabold text-gray-900">
                      {reservation.Payment
                        ? formatCurrency(reservation.Payment.amount)
                        : "—"}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Actions */}
        {isPending && (
          <div className="flex justify-end pt-4 border-t border-dashed border-gray-200">
            <Link
              href={`/checkout/${reservation.id}`}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 active:scale-95 transition-all duration-150"
            >
              Lanjutkan Pembayaran
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        )}

      </div>
    </div>
  );
};

// Helper component
const InfoRow = ({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) => (
  <div className="flex items-center justify-between py-2 border-b border-dashed border-gray-100 last:border-0">
    <span className="text-sm text-gray-400">{label}</span>
    <span className={`text-sm font-semibold text-gray-800 ${capitalize ? "capitalize" : ""}`}>
      {value}
    </span>
  </div>
);

export default ReservationDetail;