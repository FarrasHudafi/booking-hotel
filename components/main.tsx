import { notFound } from "next/navigation";
import Card from "./card";
import { getRoom } from "@/lib/data";

const Main = async () => {
  const rooms = await getRoom();
  if (!rooms) {
    return notFound();
  }
  return (
    <div className="max-w-7xl py-6 pb-20 px-4 mx-auto">
      <div className="grid gap-7 md:grid-cols-3">
        {rooms.map((room) => (
          <Card key={room.id} room={room} />
        ))}
      </div>
    </div>
  );
};

export default Main;
