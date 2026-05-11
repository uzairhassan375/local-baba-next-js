import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseStockPriceCsv } from "@/lib/csv/simple";

function isAdminEmail(email: string | undefined): boolean {
  const expected = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim();
  if (!expected || !email) return false;
  return email.toLowerCase() === expected.toLowerCase();
}

const MAX_ROWS = 5_000;
const BATCH = 24;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let text: string;
  try {
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = (await request.json()) as { csv?: string };
      text = typeof body.csv === "string" ? body.csv : "";
    } else {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Expected form field "file" (CSV) or JSON body { csv }' }, { status: 400 });
      }
      text = await file.text();
    }
  } catch {
    return NextResponse.json({ error: "Could not read upload" }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "CSV is empty" }, { status: 400 });
  }

  const { rows, errors: parseErrors } = parseStockPriceCsv(text);
  if (parseErrors.length && rows.length === 0) {
    return NextResponse.json(
      { error: "Could not parse CSV", details: parseErrors.slice(0, 50), updated: 0, notFound: [] as string[] },
      { status: 400 },
    );
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `At most ${MAX_ROWS} rows per upload` }, { status: 400 });
  }

  const notFound: string[] = [];
  let updated = 0;
  const updateErrors: string[] = [];

  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const results = await Promise.all(
      chunk.map(async ({ sku, stock, price_per_pc }) => {
        const { data, error } = await supabase
          .from("products")
          .update({ stock, price_per_pc })
          .eq("sku", sku)
          .select("sku")
          .maybeSingle();

        if (error) {
          return { sku, ok: false as const, err: error.message };
        }
        if (!data) {
          return { sku, ok: false as const, err: "not_found" };
        }
        return { sku, ok: true as const, err: null };
      }),
    );

    for (const r of results) {
      if (r.ok) updated++;
      else if (r.err === "not_found") notFound.push(r.sku);
      else updateErrors.push(`${r.sku}: ${r.err}`);
    }
  }

  return NextResponse.json({
    updated,
    notFound,
    parseWarnings: parseErrors.slice(0, 100),
    updateErrors: updateErrors.slice(0, 50),
    totalInFile: rows.length,
  });
}
