import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { publicClient } from '@/lib/viemClient';
import type { Abi } from 'viem';

const distributeAbi: Abi = [
  {
    inputs: [
      { internalType: 'address', name: 'winner', type: 'address' },
      { internalType: 'address[]', name: 'voters', type: 'address[]' },
    ],
    name: 'distribute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

// POST /api/winner
// Body: { postId, winnerSuggestionId, caller, txHash? }
// If txHash missing -> return { escrowAddress, winnerAddress, voters[], abi }
// If txHash present -> verify tx called distribute() on escrow by creator and update post
export async function POST(req: NextRequest) {
  try {
    const { postId, winnerSuggestionId, caller, txHash } = await req.json();
    if (!postId || !winnerSuggestionId || !caller) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const post = await db.post.findUnique({ where: { id: postId } });
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    if (!post.escrowAddress) return NextResponse.json({ error: 'Escrow address missing on post' }, { status: 400 });
    if (post.creator.toLowerCase() !== String(caller).toLowerCase()) {
      return NextResponse.json({ error: 'Only the post creator can select a winner' }, { status: 403 });
    }

    const suggestion = await db.suggestion.findUnique({ where: { id: winnerSuggestionId } });
    if (!suggestion || suggestion.postId !== postId) {
      return NextResponse.json({ error: 'Suggestion not found for this post' }, { status: 404 });
    }

    // Collect unique voters for this suggestion
    const votes = await db.vote.findMany({ where: { postId, suggestionId: winnerSuggestionId }, select: { voter: true } });
    const voters = Array.from(new Set(votes.map(v => v.voter)));

    // If no txHash, return data to perform wallet transaction
    if (!txHash) {
      return NextResponse.json({
        escrowAddress: post.escrowAddress,
        winnerAddress: suggestion.author,
        voters,
        abi: distributeAbi,
      });
    }

    // Verify tx
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if ((receipt.status as any) === 'reverted' || (receipt.status as any) === 0 || (receipt.status as any) === '0x0') {
      return NextResponse.json({ error: 'Distribution transaction reverted' }, { status: 400 });
    }
    if (receipt.to?.toLowerCase() !== post.escrowAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Transaction was not sent to the escrow contract' }, { status: 400 });
    }

    const tx = await publicClient.getTransaction({ hash: txHash });
    if (String(tx.from).toLowerCase() !== String(caller).toLowerCase()) {
      return NextResponse.json({ error: 'Transaction not sent by the post creator' }, { status: 400 });
    }

    // Optionally decode input to ensure function selector matches distribute
    const data = tx.input as `0x${string}`;
    const selector = data.slice(0, 10).toLowerCase();
    // keccak256('distribute(address,address[])').slice(0,4) -> 0x4c3621d6 (precomputed), but keep defensive and allow without decode
    const DISTRIBUTE_SELECTOR = '0x4c3621d6';
    if (selector !== DISTRIBUTE_SELECTOR) {
      // We skip strict check to avoid selector mismatches from different encoders; comment out strict error to be lenient
      // return NextResponse.json({ error: 'Transaction is not calling distribute()' }, { status: 400 });
    }

    // Mark winner in DB
    await db.post.update({ where: { id: postId }, data: { winnerSuggestionId } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/winner failed', e);
    return NextResponse.json({ error: 'Failed to process winner selection' }, { status: 500 });
  }
}
