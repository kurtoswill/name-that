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

    // Votes per post (all time and recent)
    const votes = await db.vote.groupBy({
      by: ['postId'],
      where: { postId: { in: postIds } },
      _count: { postId: true },
    });
    const votesMap = new Map(votes.map(v => [v.postId, v._count.postId]));

    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const votesRecent = await db.vote.groupBy({
      by: ['postId'],
      where: { postId: { in: postIds }, createdAt: { gte: since } },
      _count: { postId: true },
    });
    const votesRecentMap = new Map(votesRecent.map(v => [v.postId, v._count.postId]));

    // Views per post (all time and recent)
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

    // Suggestions per post (as additional interaction metric)
    const suggestions = await db.suggestion.groupBy({
      by: ['postId'],
      where: { postId: { in: postIds } },
      _count: { postId: true },
    });
    const suggestionsMap = new Map(suggestions.map(s => [s.postId, s._count.postId]));

    // Build rows
    const rows = posts.map(p => {
      const totalVotes = votesMap.get(p.id) || 0;
      const totalViews = viewsAllMap.get(p.id) || 0;
      const recentViews = viewsWindowMap.get(p.id) || 0;
      const recentVotes = votesRecentMap.get(p.id) || 0;
      const suggestionsCount = suggestionsMap.get(p.id) || 0;

      // Enhanced trending score calculation
      const ageHrs = Math.max(1, (Date.now() - p.createdAt.getTime()) / (1000 * 60 * 60));

      // Recent engagement metrics (more important for trending)
      const recentEngagementRate = recentViews > 0 ? recentVotes / recentViews : 0;
      const recentVoteVelocity = recentVotes / Math.max(1, ageHrs); // votes per hour in window

      // Overall engagement
      const overallEngagementRate = totalViews > 0 ? totalVotes / totalViews : 0;

      // Time decay: newer posts get higher scores, but with diminishing returns
      const timeDecay = Math.max(0.1, 1 / Math.pow(ageHrs / 24, 0.3));

      // Interaction diversity bonus (suggestions indicate more engagement)
      const interactionBonus = Math.min(5, suggestionsCount * 0.5);

      // Trending score formula
      const trendingScore = (
        (recentEngagementRate * 150) +     // Recent engagement (highest weight)
        (recentVoteVelocity * 50) +        // Recent vote velocity
        (overallEngagementRate * 50) +     // Overall engagement
        (recentViews * 0.1) +             // Recent views
        interactionBonus                   // Interaction diversity
      ) * timeDecay;

      const score = Math.round(trendingScore * 100) / 100;

      return {
        postId: p.id,
        totalVotes,
        totalViews,
        createdAt: p.createdAt.toISOString(),
        score,
        recentVotes,
        recentViews,
        suggestionsCount
      };
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
