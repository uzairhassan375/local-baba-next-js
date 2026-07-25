import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadBufferToBunny } from "@/lib/bunny/storage";

function parseDataUri(uri: string): { contentType: string; bytes: Buffer } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(uri);
  if (!match) return null;
  return { contentType: match[1], bytes: Buffer.from(match[2], "base64") };
}

// POST /api/subscriptions/submit
// Body: { userEmail, userName, paymentProofUrl, amount? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail, userName, amount } = body;
    let { paymentProofUrl } = body;

    if (!userEmail || !paymentProofUrl) {
      return NextResponse.json(
        { success: false, error: "userEmail and paymentProofUrl are required." },
        { status: 400 }
      );
    }

    // Never persist inline image data — always store a Bunny CDN URL.
    if (typeof paymentProofUrl === "string" && paymentProofUrl.startsWith("data:")) {
      const parsed = parseDataUri(paymentProofUrl);
      if (!parsed) {
        return NextResponse.json(
          { success: false, error: "Invalid payment proof image data." },
          { status: 400 }
        );
      }
      try {
        const ext = parsed.contentType.split("/")[1] || "png";
        paymentProofUrl = await uploadBufferToBunny({
          bytes: parsed.bytes,
          contentType: parsed.contentType,
          objectPath: `subscription_payments/${Date.now()}-${crypto.randomUUID()}.${ext}`,
        });
      } catch (err) {
        console.error("[subscriptions/submit] Bunny upload failed for inline image:", err);
        return NextResponse.json(
          { success: false, error: "Could not store payment proof image. Please try again." },
          { status: 502 }
        );
      }
    } else if (typeof paymentProofUrl !== "string" || !/^https?:\/\//i.test(paymentProofUrl)) {
      return NextResponse.json(
        { success: false, error: "paymentProofUrl must be an image URL." },
        { status: 400 }
      );
    }

    const cleanEmail = userEmail.toLowerCase().trim();
    const supabase = await createClient();

    // Check if subscription record already exists for this email
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_email", cleanEmail)
      .limit(1)
      .maybeSingle();

    const record = {
      user_id: cleanEmail,
      user_email: cleanEmail,
      user_name: (userName || cleanEmail.split("@")[0]).trim(),
      payment_proof_url: paymentProofUrl,
      amount: Number(amount) || 10.0,
      currency: "USD",
      status: "pending",
      bank_name: "Meezan Bank",
      account_title: "The Local Baba Trading",
      iban: "PK00MEZN000123456789",
      updated_at: new Date().toISOString(),
    };

    let resultData;
    let resultError;

    if (existing?.id) {
      // Update existing record
      const { data, error } = await supabase
        .from("subscriptions")
        .update(record)
        .eq("id", existing.id)
        .select()
        .single();
      resultData = data;
      resultError = error;
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from("subscriptions")
        .insert(record)
        .select()
        .single();
      resultData = data;
      resultError = error;
    }

    if (resultError) {
      console.error("[subscriptions/submit] Supabase error:", resultError);
      return NextResponse.json(
        { success: false, error: resultError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment proof submitted! Admin will verify and activate your subscription.",
      subscription: resultData,
    });
  } catch (err: any) {
    console.error("[subscriptions/submit] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
