import Image from "next/image";
import { getReservationByUserId } from "@/lib/data";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { differenceInCalendarDays } from "date-fns";
import Link from "next/link";

const MyReserveList = async () => {
  const reservations = await getReservationByUserId();
  if (!reservations) return notFound();

  return (
    <div className="space-y-5">
      {reservations.map((item) => {
        const nights = differenceInCalendarDays(item.endDate, item.startDate);
        const isPaid = item.Payment?.status !== "unpaid";

        return (
          <div
            key={item.id}
            className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            {/* Header bar */}
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-mono text-gray-400 tracking-wide">
                #{item.id}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${
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
                {item.Payment?.status ?? "Pending"}
              </span>
            </div>

            {/* Body */}
            <div className="flex flex-col md:flex-row">
              {/* Image */}
              <div className="relative w-full md:w-56 h-52 md:h-auto shrink-0 overflow-hidden">
                <Image
                  src={item.Room.image}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  alt="Room image"
                />
              </div>

              {/* Details */}
              <div className="flex flex-col justify-between flex-1 p-5">
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  <DetailRow
                    label="Room Rate"
                    value={formatCurrency(item.price)}
                  />
                  <DetailRow
                    label="Check-in"
                    value={formatDate(item.startDate.toISOString())}
                  />
                  <DetailRow
                    label="Check-out"
                    value={formatDate(item.endDate.toISOString())}
                  />
                  <DetailRow
                    label="Duration"
                    value={`${nights} ${nights === 1 ? "Night" : "Nights"}`}
                  />
                  <div className="col-span-2 pt-3 mt-1 border-t border-dashed border-gray-200 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Total
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      {item.Payment ? formatCurrency(item.Payment.amount) : "—"}
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex justify-end mt-4">
                  {isPaid ? (
                    <Link
                      href={`/myreservation/${item.id}`}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 active:scale-95 transition-all duration-150"
                    >
                      View Details
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
                  ) : (
                    <Link
                      href={`/checkout/${item.id}`}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 active:scale-95 transition-all duration-150"
                    >
                      Pay Now
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
                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                        />
                      </svg>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Small helper component for detail rows
const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">
      {label}
    </span>
    <span className="text-sm font-semibold text-gray-800">{value}</span>
  </div>
);

export default MyReserveList;
