import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/subscriptions/list  (admin only)
export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[subscriptions/list] Supabase error:", error);
      return NextResponse.json({ success: false, subscriptions: [], error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, subscriptions: data || [] });
  } catch (err: any) {
    console.error("[subscriptions/list] Unexpected error:", err);
    return NextResponse.json({ success: false, subscriptions: [], error: err?.message }, { status: 500 });
  }
}
