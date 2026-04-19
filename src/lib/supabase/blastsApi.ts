import { createClient } from "@/lib/supabase/client";

export type BlastStatus = "draft" | "published" | "archived";

export type Blast = {
  id: string;
  title: string;
  body: string;
  targetCities: string[];
  status: BlastStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type BlastRow = {
  id: string;
  title: string;
  body: string;
  target_cities: unknown;
  status: BlastStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

export function mapRowToBlast(row: BlastRow): Blast {
  return {
    id: row.id,
    title: row.title ?? "",
    body: row.body,
    targetCities: asStringArray(row.target_cities),
    status: row.status,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Empty target_cities = show to all members. */
export function blastVisibleForMemberCity(blast: Blast, memberCity: string | undefined): boolean {
  if (blast.status !== "published") return false;
  if (!blast.targetCities.length) return true;
  if (!memberCity) return true;
  return blast.targetCities.includes(memberCity);
}

export type BlastPayload = {
  title: string;
  body: string;
  target_cities: string[];
  status: BlastStatus;
  sort_order: number;
};

export async function fetchPublishedBlasts(): Promise<Blast[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("blasts")
    .select("*")
    .eq("status", "published")
    .order("sort_order", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as BlastRow[]).map(mapRowToBlast);
}

export async function fetchAdminBlasts(): Promise<Blast[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("blasts").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as BlastRow[]).map(mapRowToBlast);
}

export async function insertBlast(payload: BlastPayload): Promise<Blast> {
  const supabase = createClient();
  const { data, error } = await supabase.from("blasts").insert(payload).select("*").single();
  if (error) throw error;
  return mapRowToBlast(data as BlastRow);
}

export async function updateBlast(id: string, payload: BlastPayload): Promise<Blast> {
  const supabase = createClient();
  const { data, error } = await supabase.from("blasts").update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  return mapRowToBlast(data as BlastRow);
}

export async function deleteBlast(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("blasts").delete().eq("id", id);
  if (error) throw error;
}
