import {
  LuChartArea,
  LuShoppingCart,
  LuUsers,
  LuTrendingUp,
  LuGauge,
} from "react-icons/lu";
import {
  getRevenueAndReserve,
  getTotalCustomer,
  getRevPARMetricsLastDays,
} from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import { notFound } from "next/navigation";

const DashboardCard = async () => {
  const [data, totalCustomer, revparMetrics] = await Promise.all([
    getRevenueAndReserve(),
    getTotalCustomer(),
    getRevPARMetricsLastDays(30),
  ]);

  if (!data || !totalCustomer || !revparMetrics) {
    return notFound();
  }

  const cards = [
    {
      title: "Total Revenue",
      value: formatCurrency(data.revenue),
      icon: <LuChartArea className="size-6" />,
      sub: "All time earnings",
      accent: "from-yellow-400 to-yellow-500",
      iconBg: "bg-yellow-100 text-yellow-600",
      trend: "+12% this month",
    },
    {
      title: "Total Reservation",
      value: data.reserve,
      icon: <LuShoppingCart className="size-6" />,
      sub: "Bookings received",
      accent: "from-blue-500 to-blue-600",
      iconBg: "bg-blue-100 text-blue-600",
      trend: "+8% this month",
    },
    {
      title: "Total Customers",
      value: totalCustomer.length,
      icon: <LuUsers className="size-6" />,
      sub: "Registered users",
      accent: "from-emerald-400 to-emerald-500",
      iconBg: "bg-emerald-100 text-emerald-600",
      trend: "+5% this month",
    },
  ];

  const occPct = (revparMetrics.occupancyRate * 100).toFixed(1);

  return (
    <div className="pb-10">
    <div className="grid md:grid-cols-3 gap-5 mt-2">
      {cards.map(({ title, value, icon, sub, accent, iconBg, trend }) => (
        <div
          key={title}
          className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
        >
          {/* Top accent bar */}
          <div className={`h-1 w-full bg-linear-to-r ${accent}`} />

          <div className="p-6 flex flex-col gap-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">{title}</span>
              <div className={`p-2 rounded-xl ${iconBg}`}>{icon}</div>
            </div>

            {/* Value */}
            <div>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">
                {value}
              </p>
              <p className="text-xs text-gray-400 mt-1">{sub}</p>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-1.5 pt-1 border-t border-gray-50">
              <LuTrendingUp className="size-3.5 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-600">
                {trend}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-6 rounded-2xl border border-amber-100 bg-linear-to-br from-amber-50/90 to-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-800">
            Dynamic pricing · last 30 days
          </p>
          <h2 className="text-lg font-bold text-gray-900 mt-1">
            RevPAR &amp; elasticity snapshot
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-xl">
            RevPAR = revenue ÷ available room-nights. ADR × occupancy cross-check
            (decomposed RevPAR) validates the booking curve used for surge and
            early-booking discounts.
          </p>
        </div>
        <div className="p-3 rounded-xl bg-amber-100 text-amber-700">
          <LuGauge className="size-6" />
        </div>
      </div>

      <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        <div className="rounded-xl bg-white/80 border border-amber-100/80 p-4">
          <p className="text-xs text-gray-500">RevPAR (30d)</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">
            {formatCurrency(Math.round(revparMetrics.revpar))}
          </p>
        </div>
        <div className="rounded-xl bg-white/80 border border-amber-100/80 p-4">
          <p className="text-xs text-gray-500">ADR (implied)</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">
            {formatCurrency(revparMetrics.adr)}
          </p>
        </div>
        <div className="rounded-xl bg-white/80 border border-amber-100/80 p-4">
          <p className="text-xs text-gray-500">Occupancy (sold / capacity)</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{occPct}%</p>
        </div>
        <div className="rounded-xl bg-white/80 border border-amber-100/80 p-4">
          <p className="text-xs text-gray-500">ε demand (est.)</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">
            {revparMetrics.priceElasticityEstimate.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-6 text-xs text-gray-600 border-t border-amber-100/80 pt-4">
        <span>
          ADR × Occ (check):{" "}
          <strong>{formatCurrency(Math.round(revparMetrics.decomposedRevPAR))}</strong>
        </span>
        <span>
          Sold room-nights: <strong>{revparMetrics.soldRoomNights}</strong>
        </span>
        <span>
          Available room-nights: <strong>{revparMetrics.availableRoomNights}</strong>
        </span>
      </div>
    </div>
    </div>
  );
};

export default DashboardCard;
