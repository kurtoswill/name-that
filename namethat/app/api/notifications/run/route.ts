import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Find posts older than 24h without winner and push reminder to Redis
export async function POST(_req: NextRequest) {
  const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const pending = await prisma.post.findMany({
    where: { deleted: false, winnerSuggestionId: null, createdAt: { lt: threshold } },
    select: { id: true, creator: true },
  });
  const redis = getRedis();
  const now = Date.now();
  const reminders = [] as any[];
  for (const p of pending) {
    const payload = { type: "reminder_pick_winner", postId: p.id, creator: p.creator, dueAt: now };
    reminders.push(payload);
    if (redis) {
      await redis.rpush("notifications:queue", JSON.stringify(payload));
    }
  }
  return NextResponse.json({ count: reminders.length, reminders });
}
