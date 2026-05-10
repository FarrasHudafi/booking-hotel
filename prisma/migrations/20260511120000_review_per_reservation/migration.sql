-- Satu ulasan per reservasi (bukan per user+kamar).
DROP INDEX IF EXISTS "Review_userId_roomId_key";

DELETE FROM "Review";

ALTER TABLE "Review" ADD COLUMN "reservationId" TEXT NOT NULL;

CREATE UNIQUE INDEX "Review_reservationId_key" ON "Review"("reservationId");

ALTER TABLE "Review" ADD CONSTRAINT "Review_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
