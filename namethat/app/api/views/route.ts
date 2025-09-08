import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/views?postId=...&windowDays=7 (optional)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');
    const windowDaysStr = searchParams.get('windowDays');
    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 });

    const windowDays = windowDaysStr ? Math.max(1, Number(windowDaysStr)) : null;
    let where: any = { postId };
    if (windowDays) {
      const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
      where.createdAt = { gte: since };
    }

    const count = await db.view.count({ where });
    return NextResponse.json({ views: count });
  } catch (e) {
    console.error('GET /api/views failed', e);
    return NextResponse.json({ error: 'Failed to fetch views' }, { status: 500 });
  }
}
