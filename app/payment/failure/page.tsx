import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HiXCircle } from "react-icons/hi";

export const metadata: Metadata = {
  title: "Payment Failure",
};

const PaymentFailure = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <HiXCircle className="text-red-500 size-16 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2 text-gray-800">
          Payment Failure!
        </h1>
        <p className="text-gray-600 mb-6">
          Payment failed. Please try again or contact support if the issue
          persists.
        </p>
        <Link
          href="/myreservations"
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          View My Reservations
        </Link>
      </div>
    </div>
  );
};

export default PaymentFailure;
