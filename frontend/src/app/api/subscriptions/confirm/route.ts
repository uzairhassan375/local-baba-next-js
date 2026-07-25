import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/subscriptions/confirm
// Body: { subscriptionId }  OR  { userEmail }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriptionId, userEmail } = body;

    if (!subscriptionId && !userEmail) {
      return NextResponse.json(
        { success: false, error: "subscriptionId or userEmail is required." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const updates = {
      status: "active",
      updated_at: new Date().toISOString(),
    };

    let query = supabase.from("subscriptions").update(updates);

    if (subscriptionId) {
      query = query.eq("id", subscriptionId);
    } else {
      query = query.eq("user_email", userEmail.toLowerCase().trim());
    }

    const { data, error } = await query.select().single();

    if (error) {
      console.error("[subscriptions/confirm] Supabase error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Payment confirmed for ${data.user_email}! Features unlocked.`,
      subscription: data,
    });
  } catch (err: any) {
    console.error("[subscriptions/confirm] Unexpected error:", err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
