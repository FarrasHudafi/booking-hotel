import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Room } from "@prisma/client";

const Card = ({ room }: { room: Room }) => {
  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
      {/* Image */}
      <div className="relative h-56 overflow-hidden">
        <Image
          src={room.image}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          alt={room.name}
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {/* Capacity badge */}
        <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-3.5 h-3.5 text-orange-500"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
          {room.capacity} {room.capacity === 1 ? "Person" : "People"}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <p className="text-[10px] font-bold tracking-[0.15em] text-orange-400 uppercase mb-1">
          Room Type
        </p>
        <h3 className="text-lg font-bold text-gray-900 mb-3 truncate">
          {room.name}
        </h3>
        <div className="border-t border-dashed border-gray-100 mb-4" />
        <div className="flex items-center justify-between mt-auto">
          <div>
            <span className="text-xl font-extrabold text-gray-900">
              {formatCurrency(room.price)}
            </span>
            <span className="text-xs text-gray-400 font-medium ml-1">
              /Night
            </span>
          </div>
          <Link
            href={`/room/${room.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 active:scale-95 transition-all duration-150 shadow-sm shadow-orange-200"
          >
            Book Now
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Card;
