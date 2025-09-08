import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contract = searchParams.get("contract");

  if (!contract) {
    return NextResponse.json({ error: "Missing contract name" }, { status: 400 });
  }

  try {
    // Locate artifact from Hardhat or Foundry build
    const artifactPath = path.join(
        process.cwd(),
        "artifacts",
        "contracts",
        `${contract}.sol`,
        `${contract}.json`
    );

    if (!fs.existsSync(artifactPath)) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    return NextResponse.json({
      abi: artifact.abi,
      bytecode: artifact.bytecode,
    });
  } catch (err) {
    console.error("Error reading artifact:", err);
    return NextResponse.json(
        { error: "Failed to load contract artifact" },
        { status: 500 }
    );
  }
}
