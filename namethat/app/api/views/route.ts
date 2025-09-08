import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        let postId: string | undefined;
        let viewerId: string | undefined;
        try {
            const body = await req.text();
            if (!body) {
                return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
            }
            const json = JSON.parse(body);
            postId = json.postId;
            viewerId = json.viewerId;
        } catch (err) {
            return NextResponse.json({ error: 'Invalid JSON input' }, { status: 400 });
        }

        if (!postId || !viewerId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Try to create a new view record, but ignore unique constraint errors
        try {
            await db.view.create({
                data: {
                    postId,
                    viewerId,
                }
            });
        } catch (err: any) {
            // If unique constraint error, ignore (view already exists)
            if (err.code !== 'P2002') {
                throw err;
            }
        }

        // Get total views for the post
        const totalViews = await db.view.count({
            where: {
                postId
            }
        });

        return NextResponse.json({ views: totalViews });
    } catch (error) {
        console.error('Error in views API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Get views for a post
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const postId = searchParams.get('postId');

        if (!postId) {
            return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
        }

        const totalViews = await db.view.count({
            where: {
                postId
            }
        });

        return NextResponse.json({ views: totalViews });
    } catch (error) {
        console.error('Error in views API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
