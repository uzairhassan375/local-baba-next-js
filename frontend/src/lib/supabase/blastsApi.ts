import { createClient } from "@/lib/supabase/client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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

async function fetchBlasts(): Promise<Blast[]> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/blasts`, { headers, cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; blasts?: Blast[]; error?: string };
  if (!res.ok || !body.success) throw new Error(body.error || "Could not load blasts.");
  return body.blasts || [];
}

/** Same endpoint for both — the backend filters to published-only for non-admins. */
export async function fetchPublishedBlasts(): Promise<Blast[]> {
  return fetchBlasts();
}

export async function fetchAdminBlasts(): Promise<Blast[]> {
  return fetchBlasts();
}

export async function insertBlast(payload: BlastPayload): Promise<Blast> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/blasts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; blast?: Blast; error?: string };
  if (!res.ok || !body.success || !body.blast) throw new Error(body.error || "Could not create blast.");
  return body.blast;
}

export async function updateBlast(id: string, payload: BlastPayload): Promise<Blast> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/blasts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; blast?: Blast; error?: string };
  if (!res.ok || !body.success || !body.blast) throw new Error(body.error || "Could not update blast.");
  return body.blast;
}

export async function deleteBlast(id: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/blasts/${id}`, { method: "DELETE", headers });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
  if (!res.ok || !body.success) throw new Error(body.error || "Could not delete blast.");
}
