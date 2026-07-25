import { NextResponse, type NextRequest } from "next/server";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB limit

function encodePathForUrl(p: string): string {
  return p
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
}

export async function POST(request: NextRequest) {
  // ── 1. Parse form data ──────────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No image file provided" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image (PNG, JPG, WEBP)" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File size exceeds 10 MB limit" }, { status: 400 });
  }

  // ── 2. Read file bytes ──────────────────────────────────────────────────────
  const body = Buffer.from(await file.arrayBuffer());

  // ── 3. Bunny Storage upload (required — no fallback) ─────────────────────────
  const apiKey  = process.env.BUNNY_STORAGE_API_KEY;
  const apiBase = process.env.BUNNY_STORAGE_API_BASE?.replace(/\/$/, "");
  const cdnBase = process.env.BUNNY_STORAGE_CDN_BASE?.replace(/\/$/, "");

  if (!apiKey || !apiBase || !cdnBase) {
    console.error("[upload-payment-proof] ❌ Bunny env vars missing");
    return NextResponse.json(
      { success: false, error: "Storage is not configured. Please contact support." },
      { status: 500 }
    );
  }

  const safeName   = file.name.replace(/[^\w.-]+/g, "_");
  const objectPath = `subscription_payments/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const putUrl     = `${apiBase}/${encodePathForUrl(objectPath)}`;

  try {
    const upstream = await fetch(putUrl, {
      method: "PUT",
      headers: {
        AccessKey: apiKey,
        "Content-Type": file.type || "application/octet-stream",
      },
      body,
    });

    if (upstream.ok) {
      const cdnUrl = `${cdnBase}/${encodePathForUrl(objectPath)}`;
      console.log("[upload-payment-proof] ✅ Bunny upload success:", cdnUrl);
      return NextResponse.json({ success: true, url: cdnUrl });
    }

    const detail = await upstream.text().catch(() => "");
    console.error("[upload-payment-proof] ❌ Bunny returned", upstream.status, detail);
    return NextResponse.json(
      { success: false, error: "Failed to upload payment proof. Please try again." },
      { status: 502 }
    );
  } catch (err) {
    console.error("[upload-payment-proof] ❌ Bunny fetch error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to upload payment proof. Please try again." },
      { status: 502 }
    );
  }
}
