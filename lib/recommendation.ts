import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RoomWithAmenities = {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  capacity: number;
  RoomAmenities: { amenityId: string }[];
};

type FeatureSpace = {
  amenityIds: string[];
  minPrice: number;
  maxPrice: number;
  minCapacity: number;
  maxCapacity: number;
};

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

function safeDiv(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return 0;
  return a / b;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function buildFeatureSpace(rooms: RoomWithAmenities[]): FeatureSpace {
  const amenitySet = new Set<string>();
  let minPrice = Number.POSITIVE_INFINITY;
  let maxPrice = 0;
  let minCapacity = Number.POSITIVE_INFINITY;
  let maxCapacity = 0;

  for (const r of rooms) {
    minPrice = Math.min(minPrice, r.price);
    maxPrice = Math.max(maxPrice, r.price);
    minCapacity = Math.min(minCapacity, r.capacity);
    maxCapacity = Math.max(maxCapacity, r.capacity);
    for (const ra of r.RoomAmenities) amenitySet.add(ra.amenityId);
  }

  const amenityIds = Array.from(amenitySet).sort();
  if (!Number.isFinite(minPrice)) minPrice = 0;
  if (!Number.isFinite(minCapacity)) minCapacity = 0;
  return {
    amenityIds,
    minPrice,
    maxPrice,
    minCapacity,
    maxCapacity,
  };
}

function roomToVector(room: RoomWithAmenities, space: FeatureSpace): number[] {
  const v: number[] = [];
  const denomPrice = space.maxPrice - space.minPrice;
  const denomCap = space.maxCapacity - space.minCapacity;
  v.push(
    clamp01(safeDiv(room.price - space.minPrice, denomPrice === 0 ? 1 : denomPrice)),
  );
  v.push(
    clamp01(
      safeDiv(
        room.capacity - space.minCapacity,
        denomCap === 0 ? 1 : denomCap,
      ),
    ),
  );

  const have = new Set(room.RoomAmenities.map((x) => x.amenityId));
  for (const id of space.amenityIds) v.push(have.has(id) ? 1 : 0);
  return v;
}

function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0]?.length ?? 0;
  if (dim === 0) return [];
  const out = new Array<number>(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) out[i] += v[i] ?? 0;
  }
  for (let i = 0; i < dim; i++) out[i] = out[i] / vectors.length;
  return out;
}

function normalizeCooccurrence(scores: Record<string, number>): Record<string, number> {
  const values = Object.values(scores);
  if (values.length === 0) return scores;
  const max = Math.max(...values, 0);
  if (max <= 0) return scores;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(scores)) out[k] = v / max;
  return out;
}

async function fetchRoomsForModel(): Promise<RoomWithAmenities[]> {
  return prisma.room.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      image: true,
      price: true,
      capacity: true,
      RoomAmenities: { select: { amenityId: true } },
    },
  });
}

async function fetchUserBookedRoomIds(userId: string, limit = 30): Promise<string[]> {
  const rows = await prisma.reservation.findMany({
    where: { userId, Payment: { status: { not: "failure" } } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { roomId: true },
  });
  return rows.map((r) => r.roomId);
}

/**
 * Item-item co-occurrence ringan:
 * - “user yang booking A juga booking B”
 * - Cocok untuk data kecil, tanpa matrix factorization.
 */
async function buildCooccurrenceScores(seedRoomIds: string[], limitUsers = 5000) {
  if (seedRoomIds.length === 0) return {} as Record<string, number>;

  // Ambil riwayat booking per user (paid / not failure), batasi user untuk tetap ringan
  const reservations = await prisma.reservation.findMany({
    where: {
      Payment: { status: { not: "failure" } },
    },
    take: limitUsers,
    orderBy: { createdAt: "desc" },
    select: { userId: true, roomId: true },
  });

  const byUser = new Map<string, Set<string>>();
  for (const r of reservations) {
    if (!byUser.has(r.userId)) byUser.set(r.userId, new Set());
    byUser.get(r.userId)!.add(r.roomId);
  }

  const seed = new Set(seedRoomIds);
  const score: Record<string, number> = {};
  for (const rooms of byUser.values()) {
    let hasSeed = false;
    for (const s of seed) {
      if (rooms.has(s)) {
        hasSeed = true;
        break;
      }
    }
    if (!hasSeed) continue;

    for (const rid of rooms) {
      if (seed.has(rid)) continue;
      score[rid] = (score[rid] ?? 0) + 1;
    }
  }
  return normalizeCooccurrence(score);
}

export type RecommendationItem = {
  roomId: string;
  score: number;
  reason: "similar-content" | "personalized" | "cooccurrence" | "fallback-popular";
};

export async function getSimilarRooms(roomId: string, k = 6) {
  const rooms = await fetchRoomsForModel();
  const base = rooms.find((r) => r.id === roomId);
  if (!base) return [];

  const space = buildFeatureSpace(rooms);
  const baseVec = roomToVector(base, space);
  const scored = rooms
    .filter((r) => r.id !== roomId)
    .map((r) => {
      const sim = cosineSimilarity(baseVec, roomToVector(r, space));
      return { room: r, sim };
    })
    .sort((a, b) => b.sim - a.sim)
    .slice(0, Math.max(0, k));

  return scored.map((x) => x.room);
}

export async function getRecommendedRoomsForCurrentUser(params?: {
  k?: number;
  seedRoomId?: string;
  /** bobot hybrid */
  contentWeight?: number;
  cfWeight?: number;
}) {
  const k = params?.k ?? 6;
  const contentWeight = params?.contentWeight ?? 0.7;
  const cfWeight = params?.cfWeight ?? 0.3;

  const session = await auth();
  const userId = session?.user?.id;

  const rooms = await fetchRoomsForModel();
  if (rooms.length === 0) return [];

  // Fallback populer: paling sering dibooking (paid)
  const popular = await prisma.reservation.groupBy({
    by: ["roomId"],
    where: { Payment: { status: { not: "failure" } } },
    _count: { roomId: true },
    orderBy: { _count: { roomId: "desc" } },
    take: Math.max(20, k),
  });
  const popularIds = popular.map((x) => x.roomId);

  const space = buildFeatureSpace(rooms);
  const roomVecById = new Map<string, number[]>();
  for (const r of rooms) roomVecById.set(r.id, roomToVector(r, space));

  const bookedIds = userId ? await fetchUserBookedRoomIds(userId) : [];
  const seedRoomIds = [
    ...(params?.seedRoomId ? [params.seedRoomId] : []),
    ...bookedIds.slice(0, 5),
  ];

  // Personalization vector: rata-rata vektor kamar yang sudah dibooking user
  const profileVec =
    bookedIds.length > 0
      ? averageVectors(
          bookedIds
            .map((id) => roomVecById.get(id))
            .filter((v): v is number[] => Array.isArray(v) && v.length > 0),
        )
      : [];

  const cfScores =
    seedRoomIds.length >= 1 && cfWeight > 0
      ? await buildCooccurrenceScores(seedRoomIds)
      : ({} as Record<string, number>);

  const exclude = new Set<string>(seedRoomIds);
  const items: RecommendationItem[] = [];
  for (const r of rooms) {
    if (exclude.has(r.id)) continue;
    const v = roomVecById.get(r.id) ?? [];
    const contentScore =
      profileVec.length > 0 ? cosineSimilarity(profileVec, v) : 0;
    const cfScore = cfScores[r.id] ?? 0;
    const score = contentWeight * contentScore + cfWeight * cfScore;
    items.push({
      roomId: r.id,
      score,
      reason:
        profileVec.length > 0
          ? cfScore > 0
            ? "personalized"
            : "personalized"
          : cfScore > 0
            ? "cooccurrence"
            : "fallback-popular",
    });
  }

  // Jika user belum ada history dan cf kosong, susun dari populer
  if (profileVec.length === 0 && Object.keys(cfScores).length === 0) {
    const popularRooms = rooms
      .filter((r) => popularIds.includes(r.id))
      .slice(0, Math.max(0, k));
    return popularRooms;
  }

  const top = items
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, k));

  const idSet = new Set(top.map((x) => x.roomId));
  const result = rooms.filter((r) => idSet.has(r.id));
  // Keep order of top
  const byId = new Map(result.map((r) => [r.id, r] as const));
  return top.map((t) => byId.get(t.roomId)).filter(Boolean);
}

