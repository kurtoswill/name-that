import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId') || undefined;
    const suggestions = await db.suggestion.findMany({
      where: postId ? { postId } : {},
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error fetching suggestions:', error)
    return NextResponse.json(
        { error: 'Failed to fetch suggestions' },
        { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { postId, author, text } = await request.json() as { postId: string; author: string; text: string };
    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 });
    if (!author || !/^0x[0-9a-fA-F]{40}$/.test(author)) return NextResponse.json({ error: 'Valid author address required' }, { status: 400 });
    if (!text || !text.trim()) return NextResponse.json({ error: 'Suggestion text required' }, { status: 400 });
    if (text.length > 140) return NextResponse.json({ error: 'Suggestion too long' }, { status: 400 });

    const post = await db.post.findUnique({ where: { id: postId } });
    if (!post || post.deleted) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    await db.user.upsert({ where: { id: author }, update: {}, create: { id: author } });
    const suggestion = await db.suggestion.create({ data: { postId, author, text: text.trim() } });

    return NextResponse.json({ suggestion }, { status: 201 })
  } catch (error) {
    console.error('Error creating suggestion:', error)
    return NextResponse.json(
        { error: 'Failed to create suggestion' },
        { status: 500 }
    )
  }
}