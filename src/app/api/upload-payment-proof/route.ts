import { NextResponse, type NextRequest } from "next/server";
import { uploadBufferToBunny } from "@/lib/bunny/storage";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB limit for payment screenshots

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image (PNG, JPG, JPEG, WEBP)" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 });
    }

    const safeName = file.name.replace(/[^\w.-]+/g, "_");
    const uniqueId = Math.random().toString(36).substring(2, 10);
    const objectPath = `payment-proofs/${Date.now()}-${uniqueId}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Bunny Storage
    const cdnUrl = await uploadBufferToBunny({
      bytes: buffer,
      contentType: file.type || "image/jpeg",
      objectPath,
    });

    return NextResponse.json({ url: cdnUrl });
  } catch (err: any) {
    console.error("Payment proof Bunny upload error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to upload payment proof image to Bunny storage" },
      { status: 500 }
    );
  }
}
