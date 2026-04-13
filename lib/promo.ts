// ============================================================
// promo.ts — Modul kalkulasi diskon/promo untuk booking hotel
// ============================================================

// ─────────────────────────────────────────
// Tipe Data
// ─────────────────────────────────────────

export type PromoType = "percentage" | "nominal";

export type PromoRule = {
  code: string;
  type: PromoType;
  value: number;
  minSubtotal?: number;
  maxDiscount?: number; // [+] cap diskon agar tidak terlalu besar (opsional)
  description: string;
};

export type PromoApplicationResult = {
  promoCode: string | null;
  promoDescription: string | null;
  discountType: PromoType | null;
  discountValue: number;
  discountAmount: number;
  totalAfterDiscount: number;
  /** Kode mentah yang diinput user (berguna untuk pesan error di UI) */
  rawInputCode: string | null;
  error?: string;
};

// ─────────────────────────────────────────
// Daftar Promo
// ─────────────────────────────────────────

export const PROMO_RULES: PromoRule[] = [
  {
    code: "HEMAT10",
    type: "percentage",
    value: 10,
    minSubtotal: 250_000,
    maxDiscount: 100_000, // [+] Diskon maks Rp100.000 walau subtotal sangat besar
    description: "Diskon 10% untuk subtotal minimal Rp250.000",
  },
  {
    code: "POTONG50",
    type: "nominal",
    value: 50_000,
    minSubtotal: 350_000,
    description: "Potongan langsung Rp50.000 untuk subtotal minimal Rp350.000",
  },
];

// ─────────────────────────────────────────
// Utilitas
// ─────────────────────────────────────────

/** Normalisasi input kode promo: trim spasi & ubah ke huruf kapital */
export function normalizePromoCode(raw: string | null | undefined): string {
  return (raw ?? "").trim().toUpperCase();
}

/** Format angka ke format rupiah, contoh: 50000 → "Rp50.000" */
export function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

// ─────────────────────────────────────────
// Fungsi Utama
// ─────────────────────────────────────────

/**
 * Terapkan kode promo ke subtotal.
 *
 * @param subtotal    - Total harga sebelum diskon (dalam Rupiah)
 * @param rawPromoCode - Kode promo mentah dari input user
 * @returns PromoApplicationResult
 */
export function applyPromoDiscount(
  subtotal: number,
  rawPromoCode?: string | null,
): PromoApplicationResult {
  const normalized = normalizePromoCode(rawPromoCode);

  // Tidak ada kode promo diinput
  if (!normalized) {
    return {
      promoCode: null,
      promoDescription: null,
      discountType: null,
      discountValue: 0,
      discountAmount: 0,
      totalAfterDiscount: subtotal,
      rawInputCode: null,
    };
  }

  // Kode tidak ditemukan
  const promo = PROMO_RULES.find((rule) => rule.code === normalized);
  if (!promo) {
    return {
      promoCode: null,
      promoDescription: null,
      discountType: null,
      discountValue: 0,
      discountAmount: 0,
      totalAfterDiscount: subtotal,
      rawInputCode: normalized, // [+] simpan kode yang diinput untuk UI error
      error: `Kode promo "${normalized}" tidak valid`,
    };
  }

  // Subtotal di bawah minimum
  if (promo.minSubtotal !== undefined && subtotal < promo.minSubtotal) {
    return {
      promoCode: null,
      promoDescription: null,
      discountType: null,
      discountValue: 0,
      discountAmount: 0,
      totalAfterDiscount: subtotal,
      rawInputCode: normalized,
      error: `Minimum transaksi ${formatRupiah(promo.minSubtotal)} untuk kode ini`, // [+] prefix "Rp"
    };
  }

  // Hitung diskon mentah
  const rawDiscount =
    promo.type === "percentage"
      ? Math.round((subtotal * promo.value) / 100)
      : promo.value;

  // [+] Terapkan cap maxDiscount jika ada
  const cappedDiscount =
    promo.maxDiscount !== undefined
      ? Math.min(rawDiscount, promo.maxDiscount)
      : rawDiscount;

  // Pastikan diskon tidak melebihi subtotal dan tidak negatif
  const discountAmount = Math.min(subtotal, Math.max(0, cappedDiscount));
  const totalAfterDiscount = Math.max(0, subtotal - discountAmount);

  return {
    promoCode: promo.code,
    promoDescription: promo.description,
    discountType: promo.type,
    discountValue: promo.value,
    discountAmount,
    totalAfterDiscount,
    rawInputCode: normalized,
  };
}

