import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_FILES = 20;
/** 100 MB — room for short product clips */
const MAX_BYTES = 100 * 1024 * 1024;

function isAdminEmail(email: string | undefined): boolean {
  const expected = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim();
  if (!expected || !email) return false;
  return email.toLowerCase() === expected.toLowerCase();
}

function encodePathForUrl(path: string): string {
  return path
    .split("/")
    .map(s => encodeURIComponent(s))
    .join("/");
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

  const apiKey = process.env.BUNNY_STORAGE_API_KEY;
  const apiBase = process.env.BUNNY_STORAGE_API_BASE?.replace(/\/$/, "");
  const cdnBase = process.env.BUNNY_STORAGE_CDN_BASE?.replace(/\/$/, "");

  if (!apiKey || !apiBase || !cdnBase) {
    return NextResponse.json({ error: "Bunny storage is not configured on the server." }, { status: 500 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const files = form.getAll("files").filter((x): x is File => x instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `At most ${MAX_FILES} files per request` }, { status: 400 });
  }

  const rawSlug = form.get("slug");
  const slug = typeof rawSlug === "string" && /^[a-z0-9-]+$/i.test(rawSlug) ? rawSlug : null;
  const folder = slug ? `products/${slug}` : `${user.id}/misc`;

  const urls: string[] = [];

  for (const file of files) {
    const type = file.type || "";
    if (!type.startsWith("image/") && !type.startsWith("video/")) {
      return NextResponse.json(
        { error: `Only image and video files are allowed (${file.name})` },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: `File too large (${file.name})` }, { status: 400 });
    }

    const safe = file.name.replace(/[^\w.-]+/g, "_");
    const objectPath = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safe}`;
    const putUrl = `${apiBase}/${encodePathForUrl(objectPath)}`;

    const body = Buffer.from(await file.arrayBuffer());
    const upstream = await fetch(putUrl, {
      method: "PUT",
      headers: {
        AccessKey: apiKey,
        "Content-Type": type || "application/octet-stream",
      },
      body,
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error("Bunny storage upload failed", upstream.status, detail);
      return NextResponse.json({ error: `Upload failed for ${file.name}` }, { status: 502 });
    }

    urls.push(`${cdnBase}/${encodePathForUrl(objectPath)}`);
  }

  return NextResponse.json({ urls });
}
