import Image from "next/image";
import { getRoomDetailById, getDisableRoomById } from "@/lib/data";
import { notFound } from "next/navigation";
import {
  IoCheckmarkCircle,
  IoPeopleOutline,
  IoStarOutline,
  IoWifiOutline,
  IoShieldCheckmarkOutline,
  IoLocationOutline,
} from "react-icons/io5";
import { formatCurrency } from "@/lib/utils";
import ReserveForm from "./reserve-form";
import Card from "@/components/card";
import { getSimilarRooms } from "@/lib/recommendation";

const RoomDetail = async ({ roomId }: { roomId: string }) => {
  const [room, disableDate] = await Promise.all([
    getRoomDetailById(roomId),
    getDisableRoomById(roomId),
  ]);

  if (!room || !disableDate) return notFound();

  const similarRooms = await getSimilarRooms(roomId, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
        {/* Main layout — Left content + Right sticky booking card */}
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left — Room content */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            {/* Image */}
            <div className="relative w-full overflow-hidden rounded-3xl shadow-md aspect-video">
              <Image
                src={room.image}
                alt={room.name}
                fill
                priority
                className="object-cover"
              />
            </div>

            {/* Room Title & Meta */}
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 bg-yellow-400 text-gray-900 text-xs font-semibold px-3 py-1 rounded-full">
                      <IoStarOutline className="size-3.5" />
                      4.9 · Excellent
                    </span>
                  </div>
                  <h1 className="text-4xl font-bold text-gray-900">
                    {room.name}
                  </h1>
                </div>
                {/* <div className="text-right">
                  <p className="text-xs text-gray-400 mb-0.5">Base rate from</p>
                  <p className="text-3xl font-bold text-yellow-500">
                    {formatCurrency(room.price)}
                  </p>
                  <p className="text-xs text-gray-400">
                    per night · dynamic pricing at checkout
                  </p>
                </div> */}
              </div>

              {/* Quick Meta Pills */}
              <div className="flex flex-wrap gap-2 mt-1">
                {[
                  {
                    icon: (
                      <IoPeopleOutline className="size-4 text-yellow-500" />
                    ),
                    label: `Up to ${room.capacity} ${room.capacity === 1 ? "person" : "people"}`,
                  },
                  {
                    icon: <IoWifiOutline className="size-4 text-yellow-500" />,
                    label: "Free WiFi",
                  },
                ].map(({ icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 bg-white border border-gray-100 rounded-full px-4 py-2 text-sm text-gray-600 shadow-sm"
                  >
                    {icon}
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Section — About & Amenities */}
          {/* About */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              About This Room
            </h2>
            <p className="text-gray-500 leading-relaxed text-sm">
              {room.description}
            </p>
          </div>

          {/* Amenities */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
            <h2 className="text-xl font-bold text-gray-900 mb-5">
              What&apos;s Included
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {room.RoomAmenities.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-yellow-300 hover:bg-yellow-50 transition-all duration-200"
                >
                  <IoCheckmarkCircle className="size-4 text-yellow-500 flex-none" />
                  <span className="text-sm text-gray-700">
                    {item.amenities.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Similar Rooms */}
          {similarRooms.length > 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
              <div className="flex items-end justify-between mb-5">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.15em] text-orange-400 uppercase mb-1">
                    Recommendation
                  </p>
                  <h2 className="text-xl font-bold text-gray-900">
                    Similar rooms you might like
                  </h2>
                </div>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                {similarRooms.map((r) => (
                  <Card key={r.id} room={r} />
                ))}
              </div>
            </div>
          ) : null}

          {/* Trust Badges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-10">
            {[
              {
                icon: <IoWifiOutline className="size-5 text-yellow-500" />,
                title: "Free WiFi",
                desc: "High-speed internet available in all rooms.",
              },
              {
                icon: <IoPeopleOutline className="size-5 text-yellow-500" />,
                title: "24/7 Support",
                desc: "Our team is here whenever you need assistance.",
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="flex items-start gap-3 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:border-yellow-200 transition-all duration-200"
              >
                <div className="p-2 bg-yellow-50 rounded-xl flex-none">
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
          </div>

          {/* Right — Booking Card */}
          <div className="lg:col-span-4">
            <div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                {/* card base rate */}
                {/* <div className="bg-slate-900 px-6 py-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
                    Base rate / night
                  </p>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-bold text-yellow-400">
                      {formatCurrency(room.price)}
                    </span>
                    <span className="text-gray-500 text-sm mb-1">/night</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2 leading-snug">
                    Final nightly rate uses occupancy, seasonality, and lead-time
                    (RevPAR-aware).
                  </p>
                  <div className="flex items-center gap-1.5 mt-3">
                    <IoPeopleOutline className="size-3.5 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      Up to {room.capacity}{" "}
                      {room.capacity === 1 ? "person" : "people"}
                    </span>
                  </div>
                </div> */}
                <div className="px-6 py-6">
                  <ReserveForm room={room} disableDate={disableDate} />
                </div>
              </div>
              <p className="text-xs text-center text-gray-400 mt-3">
                🔒 Secure booking · No hidden fees
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomDetail;
