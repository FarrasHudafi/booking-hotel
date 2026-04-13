import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { differenceInCalendarDays, subDays } from "date-fns";

export type RfmRow = {
  userId: string;
  recencyDays: number; // semakin kecil semakin baik
  frequency: number; // semakin besar semakin baik
  monetary: number; // semakin besar semakin baik
  lastBookingAt: Date | null;
  scoreR: 1 | 2 | 3 | 4;
  scoreF: 1 | 2 | 3 | 4;
  scoreM: 1 | 2 | 3 | 4;
  segment:
    | "champions"
    | "loyal"
    | "potential"
    | "new"
    | "at_risk"
    | "hibernating"
    | "others";
};

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const v0 = sorted[base] ?? 0;
  const v1 = sorted[base + 1] ?? v0;
  return v0 + rest * (v1 - v0);
}

function scoreByQuartiles(value: number, q1: number, q2: number, q3: number): 1 | 2 | 3 | 4 {
  if (value <= q1) return 1;
  if (value <= q2) return 2;
  if (value <= q3) return 3;
  return 4;
}

function invertScore(s: 1 | 2 | 3 | 4): 1 | 2 | 3 | 4 {
  // untuk recency: lebih kecil lebih baik => dibalik
  if (s === 1) return 4;
  if (s === 2) return 3;
  if (s === 3) return 2;
  return 1;
}

function segmentOf(r: number, f: number, m: number): RfmRow["segment"] {
  if (r >= 3 && f >= 3 && m >= 3) return "champions";
  if (r >= 3 && f >= 3) return "loyal";
  if (r >= 3 && f <= 2 && m >= 2) return "potential";
  if (r >= 3 && f === 1) return "new";
  if (r <= 2 && f >= 3 && m >= 2) return "at_risk";
  if (r === 1 && f <= 2) return "hibernating";
  return "others";
}

export async function computeRfmAllUsers(params?: { windowDays?: number }) {
  const windowDays = params?.windowDays ?? 365;
  const since = subDays(new Date(), windowDays);

  const rows = await prisma.reservation.findMany({
    where: {
      Payment: { status: { not: "failure" } },
      createdAt: { gte: since },
    },
    select: {
      userId: true,
      createdAt: true,
      Payment: { select: { amount: true } },
    },
  });

  const byUser = new Map<
    string,
    { last: Date | null; frequency: number; monetary: number }
  >();
  for (const r of rows) {
    const cur = byUser.get(r.userId) ?? { last: null, frequency: 0, monetary: 0 };
    cur.frequency += 1;
    cur.monetary += r.Payment?.amount ?? 0;
    cur.last = !cur.last || r.createdAt > cur.last ? r.createdAt : cur.last;
    byUser.set(r.userId, cur);
  }

  const today = new Date();
  const recencies: number[] = [];
  const freqs: number[] = [];
  const mons: number[] = [];

  const baseRows: Omit<RfmRow, "scoreR" | "scoreF" | "scoreM" | "segment">[] = [];
  for (const [userId, v] of byUser.entries()) {
    const recencyDays =
      v.last ? Math.max(0, differenceInCalendarDays(today, v.last)) : windowDays;
    recencies.push(recencyDays);
    freqs.push(v.frequency);
    mons.push(v.monetary);
    baseRows.push({
      userId,
      recencyDays,
      frequency: v.frequency,
      monetary: v.monetary,
      lastBookingAt: v.last,
    });
  }

  recencies.sort((a, b) => a - b);
  freqs.sort((a, b) => a - b);
  mons.sort((a, b) => a - b);

  const rQ1 = quantile(recencies, 0.25);
  const rQ2 = quantile(recencies, 0.5);
  const rQ3 = quantile(recencies, 0.75);
  const fQ1 = quantile(freqs, 0.25);
  const fQ2 = quantile(freqs, 0.5);
  const fQ3 = quantile(freqs, 0.75);
  const mQ1 = quantile(mons, 0.25);
  const mQ2 = quantile(mons, 0.5);
  const mQ3 = quantile(mons, 0.75);

  const out: RfmRow[] = baseRows.map((row) => {
    const rRaw = scoreByQuartiles(row.recencyDays, rQ1, rQ2, rQ3);
    const scoreR = invertScore(rRaw);
    const scoreF = scoreByQuartiles(row.frequency, fQ1, fQ2, fQ3);
    const scoreM = scoreByQuartiles(row.monetary, mQ1, mQ2, mQ3);
    const segment = segmentOf(scoreR, scoreF, scoreM);
    return { ...row, scoreR, scoreF, scoreM, segment };
  });

  out.sort((a, b) => {
    const sa = a.scoreR + a.scoreF + a.scoreM;
    const sb = b.scoreR + b.scoreF + b.scoreM;
    return sb - sa;
  });

  return {
    windowDays,
    quartiles: {
      recencyDays: { q1: rQ1, q2: rQ2, q3: rQ3 },
      frequency: { q1: fQ1, q2: fQ2, q3: fQ3 },
      monetary: { q1: mQ1, q2: mQ2, q3: mQ3 },
    },
    rows: out,
  };
}

export async function computeRfmCurrentUser(params?: { windowDays?: number }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  const all = await computeRfmAllUsers(params);
  const me = all.rows.find((x) => x.userId === userId) ?? null;
  return { ...all, me };
}

