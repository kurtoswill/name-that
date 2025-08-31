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
