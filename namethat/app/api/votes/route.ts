import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/votes?postId=... or /api/votes?suggestionId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');
    const suggestionId = searchParams.get('suggestionId');

    if (!postId && !suggestionId) {
      return NextResponse.json({ error: 'Provide postId or suggestionId' }, { status: 400 });
    }

    const where: any = {};
    if (postId) where.postId = postId;
    if (suggestionId) where.suggestionId = suggestionId;

    const votes = await db.vote.findMany({
      where,
      select: { id: true, postId: true, suggestionId: true, voter: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ votes });
  } catch (e) {
    console.error('GET /api/votes failed', e);
    return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 });
  }
}
