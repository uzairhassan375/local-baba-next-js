import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAndUploadProductImages } from "@/lib/ai/geminiListing";

export const maxDuration = 300;

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function isAdminEmail(email: string | undefined): boolean {
  const expected = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim();
  if (!expected || !email) return false;
  return email.toLowerCase() === expected.toLowerCase();
}

async function loadReferenceImage(form: FormData): Promise<{ mimeType: string; base64: string }> {
  const file = form.get("image");
  if (file instanceof File) {
    const mimeType = file.type || "image/jpeg";
    if (!mimeType.startsWith("image/")) {
      throw new Error("Only image files are allowed");
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error("Image must be 10MB or smaller");
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    return { mimeType, base64: bytes.toString("base64") };
  }

  const referenceUrl = String(form.get("referenceUrl") || "").trim();
  if (!referenceUrl || !/^https?:\/\//i.test(referenceUrl)) {
    throw new Error("Provide image file or referenceUrl");
  }

  const upstream = await fetch(referenceUrl, { signal: AbortSignal.timeout(20_000) });
  if (!upstream.ok) {
    throw new Error("Could not download reference image");
  }
  const mimeType = upstream.headers.get("content-type") || "image/jpeg";
  if (!mimeType.startsWith("image/")) {
    throw new Error("Reference URL is not an image");
  }
  const bytes = Buffer.from(await upstream.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Reference image is too large");
  }
  return { mimeType, base64: bytes.toString("base64") };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY must be configured on the server." }, { status: 500 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const countRaw = Number(form.get("count") || "1");
  const count = Number.isFinite(countRaw) ? Math.max(1, Math.min(7, Math.floor(countRaw))) : 1;

  let reference: { mimeType: string; base64: string };
  try {
    reference = await loadReferenceImage(form);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid reference image" }, { status: 400 });
  }

  try {
    const { urls, errors } = await generateAndUploadProductImages({
      apiKey: geminiKey,
      userId: user.id,
      mimeType: reference.mimeType,
      base64: reference.base64,
      count,
    });

    if (!urls.length) {
      return NextResponse.json({ error: "All regenerations failed", imageErrors: errors }, { status: 502 });
    }

    return NextResponse.json({ urls, imageErrors: errors });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Regeneration failed" },
      { status: 502 },
    );
  }
}
