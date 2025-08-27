import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { postId, winnerSuggestionId, caller } = body as { postId: string; winnerSuggestionId: string; caller: string };

    if (!/^0x[0-9a-fA-F]{40}$/.test(caller || "")) return NextResponse.json({ error: "Valid caller address required" }, { status: 400 });

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return NextResponse.json({ error: "Invalid postId" }, { status: 400 });
    if (post.winnerSuggestionId) return NextResponse.json({ error: "Winner already selected" }, { status: 409 });
    if (caller.toLowerCase() !== post.creator.toLowerCase()) {
      return NextResponse.json({ error: "Only creator can select winner" }, { status: 403 });
    }

    const suggestion = await prisma.suggestion.findUnique({ where: { id: winnerSuggestionId } });
    if (!suggestion || suggestion.postId !== postId) return NextResponse.json({ error: "Invalid suggestionId" }, { status: 400 });

    const updated = await prisma.post.update({
      where: { id: postId },
      data: { winnerSuggestionId: winnerSuggestionId },
    });

    // TODO: Call smart contract to distribute funds (50/30/20) and mark payout tx hash.

    return NextResponse.json({ post: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
