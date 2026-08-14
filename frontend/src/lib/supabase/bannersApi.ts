import { createClient } from "@/lib/supabase/client";

export interface Banner {
  id: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Admin view — every banner, including inactive ones, in display order. */
export async function fetchAdminBanners(): Promise<Banner[]> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/mobile-banners`, { headers, cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; banners?: Banner[]; error?: string };
  if (!res.ok || !body.success) throw new Error(body.error || "Could not load banners.");
  return body.banners || [];
}

export async function insertBanner(payload: { imageUrl: string; sortOrder?: number }): Promise<Banner> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/mobile-banners`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; banner?: Banner; error?: string };
  if (!res.ok || !body.success || !body.banner) throw new Error(body.error || "Could not create banner.");
  return body.banner;
}

export async function updateBanner(
  id: string,
  payload: { sortOrder?: number; isActive?: boolean },
): Promise<Banner> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/mobile-banners/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; banner?: Banner; error?: string };
  if (!res.ok || !body.success || !body.banner) throw new Error(body.error || "Could not update banner.");
  return body.banner;
}

export async function deleteBanner(id: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/mobile-banners/${id}`, { method: "DELETE", headers });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
  if (!res.ok || !body.success) throw new Error(body.error || "Could not delete banner.");
}

/** Uploads a single banner image to Bunny CDN via the same media upload
 * route product/category images use, and returns its public URL. */
export async function uploadBannerImage(file: File): Promise<string> {
  const headers = await authHeaders();
  const form = new FormData();
  form.append("files", file);
  form.append("slug", "mobile-banners");

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
