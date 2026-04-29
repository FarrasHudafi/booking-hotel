/**
 * Helper akuntansi RevPAR / ADR untuk metrics dashboard.
 *
 * NOTE: file ini dulunya berisi rule-based dynamic pricing (lead-time multiplier,
 * peak-season multiplier, demand multiplier) sebagai fallback. Sejak pricing
 * sepenuhnya pindah ke ridge regression (lihat lib/ml-pricing.ts), bagian rule-based
 * sudah dihapus. Yang tersisa hanya rumus akuntansi standar industri perhotelan
 * (RevPAR, ADR decomposition, elasticity heuristic) yang dipakai untuk MENAMPILKAN
 * metrik admin — bukan untuk mengambil keputusan harga.
 */

/**
 * RevPAR = Revenue per Available Room. Rumus standar industri.
 */
export function computeRevPAR(totalRevenue: number, availableRoomNights: number): number {
  if (availableRoomNights <= 0) return 0;
  return totalRevenue / availableRoomNights;
}

/**
 * RevPAR = ADR × Occupancy. Identitas akuntansi (bukan keputusan harga).
 */
export function decomposeRevPAR(adr: number, occupancyRate: number): number {
  return adr * Math.min(1, Math.max(0, occupancyRate));
}

/**
 * Estimasi |elastisitas| harga (nilai negatif). Heuristik display-only:
 * dipakai untuk menampilkan angka di admin metrics, tidak ikut ke prediksi harga.
 * Saat okupansi tinggi → permintaan kurang elastis (|ε| kecil).
 */
export function estimatePriceElasticityOfDemand(occupancyRate: number): number {
  const o = Math.min(1, Math.max(0, occupancyRate));
  return -1.15 + o * 0.87;
}
