// app/api/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getEthUsdPrice } from "@/lib/getEthUsdPrice";
import { publicClient } from "@/lib/viemClient";

export async function GET() {
  try {
    const posts = await db.post.findMany({
      where: { deleted: false },
      include: {
        _count: { select: { suggestions: true, votes: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { creator, title, description, imageUrl, prizeEth, escrowAddress, deployTxHash, feeTxHash } = await request.json();

    // --- Validation ---
    if (!creator || !/^0x[0-9a-fA-F]{40}$/.test(creator)) {
      return NextResponse.json({ error: "Valid creator address required" }, { status: 400 });
    }
    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }
    if (title.length > 120 || description.length > 2000) {
      return NextResponse.json({ error: "Input too long" }, { status: 400 });
    }
    if (imageUrl && !(imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))) {
      return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
    }
    if (prizeEth === undefined || prizeEth === null || isNaN(Number(prizeEth))) {
      return NextResponse.json({ error: "Invalid prize amount" }, { status: 400 });
    }

    // --- Prize in USD check ---
    const ethUsd = await getEthUsdPrice();
    const prizeUsd = Number(prizeEth) * ethUsd;
    if (prizeUsd < 1) {
      return NextResponse.json({
        error: `Prize too low. Minimum is $1 USD. Provided ≈ $${prizeUsd.toFixed(2)}`,
      }, { status: 400 });
    }

    // --- Ensure user exists ---
    await db.user.upsert({
      where: { id: creator },
      update: {},
      create: { id: creator },
    });

    // --- Verify platform fee was paid upfront ---
    const recipient = process.env.PLATFORM_FEE_RECIPIENT;
    if (!recipient || !/^0x[0-9a-fA-F]{40}$/.test(recipient)) {
      console.error("Invalid or missing PLATFORM_FEE_RECIPIENT env var");
      return NextResponse.json({ error: "Server misconfiguration: fee recipient not set" }, { status: 500 });
    }
    if (!feeTxHash) {
      return NextResponse.json({ error: "Missing fee transaction hash" }, { status: 400 });
    }

    const prizeWei = BigInt(Math.floor(Number(prizeEth) * 1e18));
    const expectedFeeWei = (prizeWei * 20n) / 100n; // 20%

    // get fee transaction + receipt
    const feeTx = await publicClient.getTransaction({ hash: feeTxHash });
    const feeRcpt = await publicClient.waitForTransactionReceipt({ hash: feeTxHash });

    const statusOk = (feeRcpt.status as unknown) === 'success' || (feeRcpt.status as unknown) === 1 || (feeRcpt.status as unknown) === '0x1';
    if (!statusOk) {
      return NextResponse.json({ error: "Fee transaction failed or not confirmed" }, { status: 400 });
    }
    const toAddr = (feeTx.to || '').toLowerCase();
    const fromAddr = (feeTx.from || '').toLowerCase();
    if (toAddr !== recipient.toLowerCase()) {
      return NextResponse.json({ error: "Fee paid to wrong recipient" }, { status: 400 });
    }
    if (fromAddr !== creator.toLowerCase()) {
      return NextResponse.json({ error: "Fee was not paid from creator address" }, { status: 400 });
    }
    if (feeTx.value < expectedFeeWei) {
      return NextResponse.json({ error: "Fee amount too low" }, { status: 400 });
    }

    // --- Verify client-provided escrow deployment ---
    if (!escrowAddress || !/^0x[0-9a-fA-F]{40}$/.test(escrowAddress)) {
      return NextResponse.json({ error: "Escrow address required" }, { status: 400 });
    }
    if (!deployTxHash) {
      return NextResponse.json({ error: "Missing escrow deploy transaction hash" }, { status: 400 });
    }

    const depReceipt = await publicClient.waitForTransactionReceipt({ hash: deployTxHash });
    const contractAddr = depReceipt.contractAddress;
    if (!contractAddr || contractAddr.toLowerCase() !== escrowAddress.toLowerCase()) {
      return NextResponse.json({ error: "Deploy tx hash does not match escrow address" }, { status: 400 });
    }

    // Ensure code exists at address
    const code = await publicClient.getBytecode({ address: escrowAddress as `0x${string}` });
    if (!code || code === '0x') {
      return NextResponse.json({ error: "No contract code at escrow address" }, { status: 400 });
    }

    // Optional: verify totalPrize equals provided prize (skipped if ABI unavailable)
    // You can enable this by importing ABI and calling readContract here.

    // --- Save post with escrow contract info ---
    const post = await db.post.create({
      data: {
        creator,
        title: String(title).trim(),
        description: String(description).trim(),
        imageUrl: imageUrl || null,
        prizeEth: Number(prizeEth),
        usdAtCreation: Number(ethUsd.toFixed(2)),
        escrowAddress,
        deployTxHash,
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
