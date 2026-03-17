import { Metadata } from "next";
import Link from "next/link";
import { HiClock } from "react-icons/hi";

export const metadata: Metadata = {
  title: "Payment Pending",
};

const PaymentPending = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <HiClock className="text-gray-500 size-16 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2 text-gray-800">
          Payment Pending!
        </h1>
        <p className="text-gray-600 mb-6">
          Your payment is currently pending. Please finish the payment process
          to confirm your reservation. If you have any questions, feel free to
          contact our support team.
        </p>
        <Link
          href="/myreservation"
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          View My Reservations
        </Link>
      </div>
    </div>
  );
};

export default PaymentPending;
