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
