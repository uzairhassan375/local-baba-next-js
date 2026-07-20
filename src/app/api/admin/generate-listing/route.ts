import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadBufferToBunny } from "@/lib/bunny/storage";
import {
  emptyListing,
  extensionForMime,
  generateAndUploadProductImages,
  generateListingCopyWithGemini,
} from "@/lib/ai/geminiListing";

export const maxDuration = 300;

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function isAdminEmail(email: string | undefined): boolean {
  const expected = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim();
  if (!expected || !email) return false;
  return email.toLowerCase() === expected.toLowerCase();
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

  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Upload a single image as field "image"' }, { status: 400 });
  }

  const mimeType = file.type || "";
  if (!mimeType.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image must be 10MB or smaller" }, { status: 400 });
  }

  const originalBytes = Buffer.from(await file.arrayBuffer());
  const base64 = originalBytes.toString("base64");
  const ext = extensionForMime(mimeType);
  const folder = `${user.id}/ai-listings/${crypto.randomUUID()}`;

  let originalImageUrl: string;
  try {
    originalImageUrl = await uploadBufferToBunny({
      bytes: originalBytes,
      contentType: mimeType,
      objectPath: `${folder}/original.${ext}`,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to upload original image" },
      { status: 502 },
    );
  }

  const listingPromise = generateListingCopyWithGemini({
    apiKey: geminiKey,
    mimeType,
    base64,
  }).then(
    listing => ({ ok: true as const, listing }),
    err => ({ ok: false as const, error: err instanceof Error ? err.message : "Listing failed" }),
  );

  const imagesPromise = generateAndUploadProductImages({
    apiKey: geminiKey,
    userId: user.id,
    mimeType,
    base64,
    count: 7,
    folder,
  }).then(
    result => ({ ok: true as const, ...result }),
    err => ({
      ok: false as const,
      urls: [] as string[],
      errors: 7,
      error: err instanceof Error ? err.message : "Image generation failed",
    }),
  );

  const [listingResult, imagesResult] = await Promise.all([listingPromise, imagesPromise]);

  const generatedImageUrls = imagesResult.urls;
  const imageErrors = imagesResult.errors;
  const listing = listingResult.ok ? listingResult.listing : emptyListing();
  const listingError = listingResult.ok ? null : listingResult.error;

  if (!generatedImageUrls.length && listingError) {
    return NextResponse.json(
      {
        error: "AI generation failed for both images and listing copy",
        listingError,
        imageErrors,
        originalImageUrl,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    originalImageUrl,
    generatedImageUrls,
    imageErrors,
    listingError,
    ...listing,
  });
}
