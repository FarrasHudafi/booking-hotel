import { LuChartArea, LuShoppingCart, LuUsers } from "react-icons/lu";
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
  return (
    <div className="grid md:grid-cols-3 gap-5 pb-10 mt-2">
      <div className="flex items-center bg-white border rounded-md overflow-hidden shadow-sm">
        <div className="p-4 bg-green-400">
          <LuChartArea className="text-white size-12" />
        </div>
        <div className="px-4 text-gray-700">
          <h3 className="text-sm tracking-wider">Total Revenue</h3>
          <p className="text-3xl">{formatCurrency(data.revenue)}</p>
        </div>
      </div>
      <div className="flex items-center bg-white border rounded-md overflow-hidden shadow-sm">
        <div className="p-4 bg-red-400">
          <LuShoppingCart className="text-white size-12" />
        </div>
        <div className="px-4 text-gray-700">
          <h3 className="text-sm tracking-wider">Total Reservation</h3>
          <p className="text-3xl">{data.reserve}</p>
        </div>
      </div>
      <div className="flex items-center bg-white border rounded-md overflow-hidden shadow-sm">
        <div className="p-4 bg-blue-400">
          <LuUsers className="text-white size-12" />
        </div>
        <div className="px-4 text-gray-700">
          <h3 className="text-sm tracking-wider">Total Customers</h3>
          <p className="text-3xl">{totalCustomer.length}</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardCard;
