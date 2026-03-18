const getMidtransBaseUrl = () => {
  const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
  return isProd ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
};

export type MidtransStatusResponse = {
  status_code?: string;
  status_message?: string;
  transaction_status?: string;
  payment_type?: string;
  gross_amount?: string;
  currency?: string;
  order_id?: string;
  transaction_time?: string;
  expiry_time?: string;
  fraud_status?: string;
  va_numbers?: Array<{ bank: string; va_number: string }>;
  permata_va_number?: string;
  bill_key?: string;
  biller_code?: string;
  actions?: Array<{ name: string; method: string; url: string }>;
  qr_string?: string;
  [key: string]: unknown;
};

export async function getMidtransTransactionStatus(
  orderId: string,
): Promise<MidtransStatusResponse | null> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return null;

  const baseUrl = getMidtransBaseUrl();
  const auth = Buffer.from(`${serverKey}:`).toString("base64");

  const res = await fetch(`${baseUrl}/v2/${encodeURIComponent(orderId)}/status`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
    // Midtrans status can change quickly; avoid stale cache.
    cache: "no-store",
  });

  if (!res.ok) return null;
  return (await res.json()) as MidtransStatusResponse;
}

