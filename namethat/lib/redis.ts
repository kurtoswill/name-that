import { Redis } from "@upstash/redis";

let client: Redis | null = null;

export function getRedis(): Redis | null {
  try {
    if (client) return client;
    const url = process.env.REDIS_URL;
    const token = process.env.REDIS_TOKEN;
    if (!url || !token) return null;
    client = new Redis({ url, token });
    return client;
  } catch {
    return null;
  }
}

export async function notifyAfterOneDay(postId: string, creator: string) {
  // Prototype: push a reminder item with dueAt timestamp
  const redis = getRedis();
  const dueAt = Date.now() + 24 * 60 * 60 * 1000;
  const payload = { type: "reminder_pick_winner", postId, creator, dueAt };
  if (!redis) return payload; // no-op if not configured
  await redis.rpush("notifications:queue", JSON.stringify(payload));
  return payload;
}
