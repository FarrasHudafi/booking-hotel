import HeaderSection from "@/components/header-section";
import Main from "@/components/main";
import { Metadata } from "next";
import { Suspense } from "react";
import RoomSkeleton from "@/components/skeletons/room-skeleton";

export const metadata: Metadata = {
  title: "Room & Rates",
  description: "Choose Your perfect stay",
};

const RoomPage = () => {
  return (
    <div className="min-h-screen bg-[#f8f6f2]">
      <HeaderSection
        title="Room & Rates"
        subTitle="Choose your perfect stay"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-orange-500 uppercase mb-1">
              Our Collection
            </p>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
              Available Rooms
            </h2>
          </div>
          <p className="text-sm text-gray-400 hidden sm:block">
            All prices per night · Taxes included
          </p>
        </div>
        <Suspense fallback={<RoomSkeleton />}>
          <Main />
        </Suspense>
      </div>
    </div>
  );
};

export default RoomPage;