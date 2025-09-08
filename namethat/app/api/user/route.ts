import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { id, username, profile } = await req.json();
  if (!id) {
    return NextResponse.json({ error: 'Missing wallet address (id)' }, { status: 400 });
  }

  // Check if user exists
  const user = await db.user.findUnique({ where: { id } });
  if (user) {
    return NextResponse.json(user);
  }

  // Create new user, handle unique constraint error
  try {
    const newUser = await db.user.create({
      data: {
        id,
        username: username || `User${id.slice(-6)}`,
        profile: profile || null,
      },
    });
    return NextResponse.json(newUser);
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Unique constraint failed, return existing user
      const existingUser = await db.user.findUnique({ where: { id } });
      return NextResponse.json(existingUser);
    }
    throw error;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing wallet address (id)' }, { status: 400 });
  }
  const user = await db.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  return NextResponse.json(user);
}

// PATCH /api/user -> update username and profile (e.g., bio)
export async function PATCH(req: NextRequest) {
  try {
    const { id, username, bio } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing wallet address (id)' }, { status: 400 });

    // Build profile json merge
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const profile = (existing.profile as any) || {};
    if (typeof bio === 'string') profile.bio = bio;

    const updated = await db.user.update({
      where: { id },
      data: {
        username: typeof username === 'string' && username.trim() ? username.trim() : existing.username,
        profile,
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('PATCH /api/user failed', e);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
