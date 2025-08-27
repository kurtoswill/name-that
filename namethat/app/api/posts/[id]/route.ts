import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  const { searchParams } = new URL(req.url);
  const caller = searchParams.get("caller") || "";

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!/^0x[0-9a-fA-F]{40}$/.test(caller)) return NextResponse.json({ error: "Valid caller required" }, { status: 400 });
  if (caller.toLowerCase() !== post.creator.toLowerCase()) return NextResponse.json({ error: "Only creator can delete" }, { status: 403 });
  if (!post.winnerSuggestionId) return NextResponse.json({ error: "Cannot delete until a winner is selected" }, { status: 409 });

  await prisma.post.update({ where: { id }, data: { deleted: true } });
  return NextResponse.json({ ok: true });
}
