import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/subscriptions/status?email=...
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.toLowerCase().trim();

  if (!email) {
    return NextResponse.json({ isSubscribed: false, status: "none" });
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[subscriptions/status] Supabase error:", error);
      return NextResponse.json({ isSubscribed: false, status: "none" });
    }

    if (!data) {
      return NextResponse.json({ isSubscribed: false, status: "none" });
    }

    // 30-day subscription expiration check
    let status = data.status;
    let isSubscribed = data.status === "active";

    if (status === "active") {
      const activeTimestamp = new Date(data.updated_at || data.created_at).getTime();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      if (Date.now() - activeTimestamp > thirtyDaysMs) {
        status = "expired";
        isSubscribed = false;
      }
    }

    return NextResponse.json({
      isSubscribed,
      status,
      subscription: { ...data, status },
    });
  } catch (err: any) {
    console.error("[subscriptions/status] Unexpected error:", err);
    return NextResponse.json({ isSubscribed: false, status: "none" });
  }
}
