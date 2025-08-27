import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function env(name: string) { return process.env[name]; }

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const mime = file.type || "";
    if (!mime.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 415 });
    }

    const CLOUD_NAME = env("CLOUDINARY_CLOUD_NAME");
    const API_KEY = env("CLOUDINARY_API_KEY");
    const API_SECRET = env("CLOUDINARY_API_SECRET");
    const UPLOAD_PRESET = env("CLOUDINARY_UPLOAD_PRESET");

    if (!CLOUD_NAME || (!(API_KEY && API_SECRET) && !UPLOAD_PRESET)) {
      return NextResponse.json({ error: "Cloudinary not configured" }, { status: 500 });
    }

    const cloudForm = new FormData();
    cloudForm.append("file", file);

    let uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

    if (UPLOAD_PRESET) {
      cloudForm.append("upload_preset", UPLOAD_PRESET);
    } else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const params = new URLSearchParams({ timestamp });
      const raw = params.toString();
      const crypto = await import("node:crypto");
      const signature = crypto.createHash("sha1").update(raw + API_SECRET!).digest("hex");
      cloudForm.append("timestamp", timestamp);
      cloudForm.append("api_key", API_KEY!);
      cloudForm.append("signature", signature);
    }

    const resp = await fetch(uploadUrl, { method: "POST", body: cloudForm as any });
    const data = await resp.json();
    if (!resp.ok) {
      return NextResponse.json({ error: data?.error?.message || "Upload failed" }, { status: 500 });
    }

    const url: string | undefined = data.secure_url || data.url;
    if (!url) return NextResponse.json({ error: "Upload failed: no URL" }, { status: 500 });

    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
