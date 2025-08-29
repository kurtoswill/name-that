import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { postId, suggestionId, voter } = await request.json()

    if (!postId || !suggestionId) return NextResponse.json({ error: 'postId and suggestionId required' }, { status: 400 });
    if (!voter || !/^0x[0-9a-fA-F]{40}$/.test(voter)) return NextResponse.json({ error: 'Valid voter address required' }, { status: 400 });

    // Ensure user exists
    await db.user.upsert({
      where: { id: voter },
      update: {},
      create: { id: voter }
    })

    // Check if user already voted on this post
    const existingVote = await db.vote.findUnique({
      where: {
        voter_postId: { voter, postId }
      }
    })

    if (existingVote) {
      return NextResponse.json(
          { error: 'User has already voted on this post' },
          { status: 409 }
      )
    }

    // Verify post and suggestion exist
    const [post, suggestion] = await Promise.all([
      db.post.findUnique({ where: { id: postId } }),
      db.suggestion.findUnique({ where: { id: suggestionId } })
    ])

    if (!post) {
      return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
      )
    }

    if (!suggestion || suggestion.postId !== postId) {
      return NextResponse.json(
          { error: 'Suggestion not found' },
          { status: 404 }
      )
    }

    const vote = await db.vote.create({
      data: {
        postId,
        suggestionId,
        voter
      }
    })

    return NextResponse.json({ vote }, { status: 201 })
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as Record<string, unknown>).code === 'P2002'
    ) {
      return NextResponse.json({ error: 'User has already voted on this post' }, { status: 409 });
    }
    console.error('Error creating vote:', error)
    return NextResponse.json(
        { error: 'Failed to create vote' },
        { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId') || undefined;
    const votes = await db.vote.findMany({
      where: postId ? { postId } : {},
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ votes })
  } catch (error) {
    console.error('Error fetching votes:', error)
    return NextResponse.json(
        { error: 'Failed to fetch votes' },
        { status: 500 }
    )
  }
}