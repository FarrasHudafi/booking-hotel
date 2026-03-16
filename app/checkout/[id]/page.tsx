import CheckoutDetail from "@/components/checkout-detail";
import { Suspense } from "react";
import { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Reservation Summary",
};

const CheckoutPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const reservationId = (await params).id;
  return (
    <div className="max-w-7xl px-4 mx-auto py-20 mt-12">
      <h1 className="text-2xl mb-8 font-semibold">Reservation Summary</h1>
      <Suspense fallback={<h1>Loading...</h1>}>
        <CheckoutDetail reservationId={reservationId} />
      </Suspense>

      <Script
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="lazyOnload"
      />
    </div>
  );
};

export default CheckoutPage;
