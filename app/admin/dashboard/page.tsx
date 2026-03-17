import DashboardCard from "@/components/admin/dashboard-card";
import { Metadata } from "next";
import { Suspense } from "react";
import ReservationList from "@/components/admin/reservation-list";

export const metadata: Metadata = {
  title: "Dashboard",
};

function CardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-28 rounded-2xl bg-gray-200 animate-pulse" />
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="mt-8 rounded-2xl border border-gray-200 overflow-hidden">
      <div className="h-12 bg-gray-100 border-b border-gray-200" />
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 last:border-0"
        >
          <div className="h-4 w-4 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 flex-1 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

const DashboardPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16 pt-20">
      <h1 className="text-4xl font-bold pt-3 text-gray-800">DashBoard</h1>
      <Suspense fallback={<CardSkeleton />}>
        <DashboardCard />
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <ReservationList />
      </Suspense>
    </div>
  );
};

export default DashboardPage;
