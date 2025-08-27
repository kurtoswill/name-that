import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = (searchParams.get("mode") || "all").toLowerCase();

  if (mode === "trending") {
    const now = new Date();
    const votes = await prisma.vote.findMany({
      where: { post: { deleted: false } },
      select: { postId: true, createdAt: true },
    });
    const map = new Map<string, number>();
    for (const v of votes) {
      const hours = (now.getTime() - v.createdAt.getTime()) / (1000 * 60 * 60);
      const decay = 1 / (1 + hours);
      map.set(v.postId, (map.get(v.postId) || 0) + decay);
    }
    const trending = Array.from(map.entries())
      .map(([postId, score]) => ({ postId, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);
    return NextResponse.json({ trending });
  } else {
    const agg = await prisma.vote.groupBy({ by: ["postId"], _count: { postId: true } });
    const allTime = agg
      .map(a => ({ postId: a.postId, totalVotes: a._count.postId }))
      .sort((a, b) => b.totalVotes - a.totalVotes)
      .slice(0, 100);
    return NextResponse.json({ allTime });
  }
}
