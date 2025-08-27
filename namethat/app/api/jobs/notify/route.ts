import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function runJob() {
  const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const pending = await prisma.post.findMany({
    where: { deleted: false, winnerSuggestionId: null, createdAt: { lt: threshold } },
    select: { id: true, creator: true },
  });
  const redis = getRedis();
  const now = Date.now();
  const reminders: any[] = [];
  for (const p of pending) {
    const payload = { type: "reminder_pick_winner", postId: p.id, creator: p.creator, dueAt: now };
    reminders.push(payload);
    if (redis) {
      await redis.rpush("notifications:queue", JSON.stringify(payload));
    }
  }
  return { count: reminders.length, reminders };
}

export async function POST(_req: NextRequest) {
  try {
    const result = await runJob();
    return NextResponse.json(result);
  } catch (e) {
    console.error("Error in notify job:", e);
    return NextResponse.json({ error: "Failed to run job" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // allow triggering via GET as well (easier for browser testing)
  return POST(req);
}
