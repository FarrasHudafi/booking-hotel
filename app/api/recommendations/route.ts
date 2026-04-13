import { NextResponse } from "next/server";
import { getRecommendedRoomsForCurrentUser } from "@/lib/recommendation";

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const k = Number(searchParams.get("k") ?? "6");
  const seedRoomId = searchParams.get("seedRoomId") ?? undefined;

  try {
    const rooms = await getRecommendedRoomsForCurrentUser({
      k: Number.isFinite(k) ? Math.max(1, Math.min(20, k)) : 6,
      seedRoomId,
    });
    return NextResponse.json({ rooms }, { status: 200 });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message: "Recommendation error", detail }, { status: 500 });
  }
};

