import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/leaderboard?mode=all|trending&windowDays=7&limit=10
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get('mode') || 'all').toLowerCase();
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || '10')));
    const windowDays = Math.max(1, Number(searchParams.get('windowDays') || '7'));

    // Base data: posts with createdAt
    const posts = await db.post.findMany({
      where: { deleted: false },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 200, // cap for performance
    });
    const postIds = posts.map(p => p.id);
    if (postIds.length === 0) return NextResponse.json({ rows: [] });

    // Votes per post
    const votes = await db.vote.groupBy({
      by: ['postId'],
      where: { postId: { in: postIds } },
      _count: { postId: true },
    });
    const votesMap = new Map(votes.map(v => [v.postId, v._count.postId]));

    // Views per post; trending counts within window
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const viewsAll = await db.view.groupBy({
      by: ['postId'],
      where: { postId: { in: postIds } },
      _count: { postId: true },
    });
    const viewsAllMap = new Map(viewsAll.map(v => [v.postId, v._count.postId]));

    const viewsWindow = await db.view.groupBy({
      by: ['postId'],
      where: { postId: { in: postIds }, createdAt: { gte: since } },
      _count: { postId: true },
    });
    const viewsWindowMap = new Map(viewsWindow.map(v => [v.postId, v._count.postId]));

    // Build rows
    const rows = posts.map(p => {
      const totalVotes = votesMap.get(p.id) || 0;
      const totalViews = viewsAllMap.get(p.id) || 0;
      const recentViews = viewsWindowMap.get(p.id) || 0;
      // simple trending score based on recent views and votes recency-neutral
      const ageHrs = Math.max(1, (Date.now() - p.createdAt.getTime()) / (1000 * 60 * 60));
      const voteVelocity = totalVotes / ageHrs;
      const engagementRate = totalViews > 0 ? totalVotes / totalViews : 0;
      const timeDecay = Math.max(0.1, 1 / Math.sqrt(ageHrs / 24));
      const score = Math.round(((engagementRate * 100) + (voteVelocity * 10) + (recentViews)) * timeDecay * 100) / 100;
      return { postId: p.id, totalVotes, totalViews, createdAt: p.createdAt.toISOString(), score };
    });

    let sorted: typeof rows;
    if (mode === 'trending') {
      sorted = rows.sort((a, b) => (b.score || 0) - (a.score || 0));
    } else {
      sorted = rows.sort((a, b) => (b.totalVotes || 0) - (a.totalVotes || 0));
    }

    return NextResponse.json({ rows: sorted.slice(0, limit) });
  } catch (e) {
    console.error('GET /api/leaderboard failed', e);
    return NextResponse.json({ error: 'Failed to build leaderboard' }, { status: 500 });
  }
}
