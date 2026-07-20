import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadBufferToBunny } from "@/lib/bunny/storage";
import { extensionForMime } from "@/lib/ai/listingTypes";

export const maxDuration = 120;

const MAX_URLS = 20;
const MAX_BYTES = 15 * 1024 * 1024;

function isAdminEmail(email: string | undefined): boolean {
  const expected = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim();
  if (!expected || !email) return false;
  return email.toLowerCase() === expected.toLowerCase();
}

function isOurCdn(url: string): boolean {
  const cdn = process.env.BUNNY_STORAGE_CDN_BASE?.replace(/\/$/, "");
  if (!cdn) return false;
  return url.startsWith(cdn);
}

async function fetchImageBytes(url: string): Promise<{ bytes: Buffer; contentType: string }> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(25_000),
    headers: { "User-Agent": "LocalBabaAdmin/1.0" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const contentType = (res.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
  if (!contentType.startsWith("image/")) {
    throw new Error("URL is not an image");
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) throw new Error("Image too large");
  return { bytes, contentType };
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

  let body: { urls?: unknown };
  try {
    body = (await request.json()) as { urls?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const urls = Array.isArray(body.urls)
    ? body.urls.filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u.trim())).map(u => u.trim())
    : [];

  if (!urls.length) {
    return NextResponse.json({ error: "Provide urls: string[]" }, { status: 400 });
  }
  if (urls.length > MAX_URLS) {
    return NextResponse.json({ error: `At most ${MAX_URLS} URLs` }, { status: 400 });
  }

  const folder = `${user.id}/ai-listings/${crypto.randomUUID()}`;
  const out: string[] = [];
  const errors: string[] = [];

  for (const [index, url] of urls.entries()) {
    try {
      if (isOurCdn(url)) {
        out.push(url);
        continue;
      }
      const { bytes, contentType } = await fetchImageBytes(url);
      const ext = extensionForMime(contentType);
      const cdnUrl = await uploadBufferToBunny({
        bytes,
        contentType,
        objectPath: `${folder}/sel-${index + 1}.${ext}`,
      });
      out.push(cdnUrl);
    } catch (e) {
      console.error("import image failed", url, e);
      errors.push(e instanceof Error ? e.message : "import failed");
    }
  }

  if (!out.length) {
    return NextResponse.json({ error: "Could not import any images", errors }, { status: 502 });
  }

  return NextResponse.json({ urls: out, errors: errors.length ? errors : undefined });
}
