import { createClient } from "@/lib/supabase/client";

export interface Category {
  id: string;
  name: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Admin view — every category, including inactive ones, in display order. */
export async function fetchAdminCategories(): Promise<Category[]> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/categories`, { headers, cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; categories?: Category[]; error?: string };
  if (!res.ok || !body.success) throw new Error(body.error || "Could not load categories.");
  return body.categories || [];
}

/** Set a category's image/visibility by name — creates the row on first use
 * (e.g. the first time an admin uploads an image for "Kids"), updates it
 * otherwise. Categories aren't separately "created" by admins; the button
 * for each one always exists (driven by the product category list) and
 * this just attaches optional display metadata to it, keyed by that name. */
export async function upsertCategory(
  name: string,
  payload: { imageUrl?: string | null; isActive?: boolean; sortOrder?: number },
): Promise<Category> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ name: name.trim(), ...payload }),
  });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; category?: Category; error?: string };
  if (!res.ok || !body.success || !body.category) throw new Error(body.error || "Could not save category.");
  return body.category;
}

/** Uploads a single category cover image to Bunny CDN via the same
 * media upload route product images use, and returns its public URL. */
export async function uploadCategoryImage(file: File): Promise<string> {
  const headers = await authHeaders();
  const form = new FormData();
  form.append("files", file);
  form.append("slug", "categories");

  const res = await fetch(`${BACKEND_URL}/api/media/upload`, {
    method: "POST",
    headers,
    body: form,
  });

  const body = (await res.json().catch(() => ({}))) as { success?: boolean; urls?: string[]; error?: string };
  if (!res.ok || !body.success || !body.urls?.length) {
    throw new Error(body.error || "Image upload failed");
  }
  return body.urls[0];
}
