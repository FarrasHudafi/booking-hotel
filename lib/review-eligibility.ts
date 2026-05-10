/** Syarat mengirim ulasan baru: lunas + tanggal checkout sudah lewat. */
export function canWriteRoomReviewFromBooking({
  paymentStatus,
  endDate,
  now = new Date(),
}: {
  paymentStatus: string | null | undefined;
  endDate: Date;
  now?: Date;
}) {
  const paid = (paymentStatus ?? "").toLowerCase() === "paid";
  return paid && endDate <= now;
}
