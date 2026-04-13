import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { computeRfmAllUsers, computeRfmCurrentUser } from "@/lib/rfm";

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "1";
  const windowDays = Number(searchParams.get("windowDays") ?? "365");
  const wd = Number.isFinite(windowDays) ? Math.max(30, Math.min(3650, windowDays)) : 365;

  try {
    if (all) {
      const session = await auth();
      if (session?.user?.role !== "admin") {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
      const result = await computeRfmAllUsers({ windowDays: wd });
      return NextResponse.json(result, { status: 200 });
    }

    const result = await computeRfmCurrentUser({ windowDays: wd });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    const status = detail.toLowerCase().includes("unauthorized") ? 401 : 500;
    return NextResponse.json({ message: "RFM error", detail }, { status });
  }
};

