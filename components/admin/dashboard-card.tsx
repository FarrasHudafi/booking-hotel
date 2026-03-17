import {
  LuChartArea,
  LuShoppingCart,
  LuUsers,
  LuTrendingUp,
} from "react-icons/lu";
import { getRevenueAndReserve, getTotalCustomer } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import { notFound } from "next/navigation";

const DashboardCard = async () => {
  const [data, totalCustomer] = await Promise.all([
    getRevenueAndReserve(),
    getTotalCustomer(),
  ]);

  if (!data || !totalCustomer) {
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

  return (
    <div className="grid md:grid-cols-3 gap-5 pb-10 mt-2">
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
  );
};

export default DashboardCard;
