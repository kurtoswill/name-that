import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const [postsCount, votesCast] = await Promise.all([
      db.post.count({ where: { creator: id, deleted: false } }),
      db.vote.count({ where: { voter: id } }),
    ]);

    // Find posts with winners
    const winningPosts = await db.post.findMany({
      where: { winnerSuggestionId: { not: null } },
      select: {
        id: true,
        prizeEth: true,
        winnerSuggestionId: true,
      },
    });

    // Map winner suggestion -> author and voter count
    const winnerSuggestionIds = winningPosts.map(p => p.winnerSuggestionId!) as string[];
    let totalEarnedEth = 0;
    if (winnerSuggestionIds.length > 0) {
      const winners = await db.suggestion.findMany({
        where: { id: { in: winnerSuggestionIds } },
        select: { id: true, author: true, postId: true },
      });
      const votersGroup = await db.vote.groupBy({
        by: ['suggestionId'],
        where: { suggestionId: { in: winnerSuggestionIds } },
        _count: { suggestionId: true },
      });
      const votersCount = new Map(votersGroup.map(v => [v.suggestionId, v._count.suggestionId]));
      const winnersById = new Map(winners.map(w => [w.id, w]));

      for (const p of winningPosts) {
        const prize = Number(p.prizeEth);
        const winnerShare = prize * 0.5;
        const votersShare = prize * 0.3;
        const win = winnersById.get(p.winnerSuggestionId!);
        const voterCnt = votersCount.get(p.winnerSuggestionId!) || 0;

        if (win && win.author.toLowerCase() === id.toLowerCase()) {
          totalEarnedEth += winnerShare;
        }
        if (voterCnt > 0) {
          // Did this user vote for this winning suggestion?
          const didVote = await db.vote.findFirst({ where: { voter: id, suggestionId: p.winnerSuggestionId! } });
          if (didVote) {
            totalEarnedEth += votersShare / voterCnt;
          }
        }
      }
    }

    return NextResponse.json({ postsCount, votesCast, totalEarnedEth });
  } catch (e) {
    console.error('GET /api/profile/metrics failed', e);
    return NextResponse.json({ error: 'Failed to compute metrics' }, { status: 500 });
  }
}
