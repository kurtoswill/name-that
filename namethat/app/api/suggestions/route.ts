import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/suggestions?postId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');
    if (!postId) {
      return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
    }
    const suggestions = await db.suggestion.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        postId: true,
        author: true,
        text: true,
        createdAt: true,
        user: { select: { username: true } },
        _count: { select: { votes: true } },
      },
    });
    const result = suggestions.map((s) => ({
      id: s.id,
      postId: s.postId,
      author: s.author,
      text: s.text,
      createdAt: s.createdAt,
      authorUsername: s.user?.username ?? null,
      votes: s._count.votes,
    }));
    return NextResponse.json({ suggestions: result });
  } catch (e) {
    console.error('GET /api/suggestions failed', e);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}
