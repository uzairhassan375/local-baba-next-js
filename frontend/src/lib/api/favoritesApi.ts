// Favorites go through the Flask backend (shared with the mobile app),
// never direct Supabase — same convention as shopifyApi.ts / subscriptionApi.ts.
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/data/mockData";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const REQUEST_TIMEOUT_MS = 8000;

export interface FavoriteEntry {
  productId: string;
  product: Product | null;
  createdAt: string;
}

export interface AdminFavoriteMember {
  authUserId: string;
  favoritedAt: string;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  city: string | null;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function safeJson(res: Response): Promise<any | null> {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return null;
  return res.json().catch(() => null);
}

export async function fetchFavorites(): Promise<FavoriteEntry[]> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/favorites`, {
      headers: { "Content-Type": "application/json", ...headers },
      cache: "no-store",
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return data.favorites as FavoriteEntry[];
  } catch (err) {
    console.warn("[favoritesApi] fetchFavorites failed:", err);
  }
  return [];
}

export async function addFavorite(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/favorites`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ productId }),
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return { success: true };
    return { success: false, error: data?.error || "Could not add favorite." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not reach backend server." };
  }
}

/** Admin-only — how many members have each product favorited, keyed by productId. */
export async function fetchAdminFavoriteCounts(): Promise<Record<string, number>> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/favorites/admin/counts`, {
      headers: { "Content-Type": "application/json", ...headers },
      cache: "no-store",
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return data.counts as Record<string, number>;
  } catch (err) {
    console.warn("[favoritesApi] fetchAdminFavoriteCounts failed:", err);
  }
  return {};
}

/** Admin-only — members who currently have `productId` favorited. */
export async function fetchAdminFavoriteMembers(productId: string): Promise<AdminFavoriteMember[]> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/favorites/admin/product/${productId}`, {
      headers: { "Content-Type": "application/json", ...headers },
      cache: "no-store",
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return data.members as AdminFavoriteMember[];
  } catch (err) {
    console.warn("[favoritesApi] fetchAdminFavoriteMembers failed:", err);
  }
  return [];
}

export async function removeFavorite(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/favorites/${productId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...headers },
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return { success: true };
    return { success: false, error: data?.error || "Could not remove favorite." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not reach backend server." };
  }
}
