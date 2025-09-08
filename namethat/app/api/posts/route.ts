// app/api/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getEthUsdPrice } from "@/lib/getEthUsdPrice";
import { walletClient } from "@/lib/viemWallet";
import { publicClient } from "@/lib/viemClient";
import PostEscrow from "@/artifacts/contracts/PostEscrow.sol/PostEscrow.json"; // ABI + bytecode

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
    const { creator, title, description, imageUrl, prizeEth } = await request.json();

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

    // --- Deploy PostEscrow smart contract ---
    const value = BigInt(Math.floor(Number(prizeEth) * 1e18)); // convert ETH → wei

    const deployHash = await walletClient.deployContract({
      abi: PostEscrow.abi,
      bytecode: PostEscrow.bytecode as `0x${string}`,
      value,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
    const escrowAddress = receipt.contractAddress;

    if (!escrowAddress) {
      throw new Error("Escrow contract did not deploy correctly");
    }

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
        deployTxHash: deployHash,
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
