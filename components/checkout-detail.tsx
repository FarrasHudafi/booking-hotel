import Image from "next/image";
import { getReservationById } from "@/lib/data";

const CheckoutDetail = async ({ reservationId }: { reservationId: string }) => {
  const reservation = await getReservationById(reservationId);
  if (!reservation || !reservation.Payment)
    return <h1>No Reservation Found</h1>;
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="order-2">
        <div className="flex flex-col mb-3 items-start bg-white border border-gray-200 rounded-sm md:flex-row md:w-full">
          <div className="aspect-video relative">
            <Image
              src={reservation.Room.image}
              width={500}
              height={300}
              className="object-cover w-full rounded-t-sm md: rounded-none md:rounded-s-sm"
              alt="image"
            />
          </div>
          <div className="flex flex-col justify-between p-4 leading-normal w-full">
            <h5 className="mb-1 text-4xl font-bold tracking-light text-gray-900">
              {reservation.Room.name}
            </h5>
            <div className="flex items-center gap-1 text-2xl text-gray-700">
              <div className="flex items-center justify-center gap-1">
                <span className="text-2xl">{reservation.price}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className=""></div>
    </div>
  );
};

export default CheckoutDetail;
