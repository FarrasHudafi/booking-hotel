import { getRoom } from "@/lib/data";
import PredictClient from "./predict-client";
import { RoomLite } from "@/components/PredictionForm";

export default async function PredictPage() {
  const rooms = (await getRoom()) ?? [];
  const lite: RoomLite[] = rooms.map((r) => ({
    id: r.id,
    name: r.name,
    price: r.price,
  }));

  return <PredictClient rooms={lite} />;
}
