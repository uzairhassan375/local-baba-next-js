// Cart goes through the Flask backend (shared with the mobile app), never
// direct Supabase — same convention as shopifyApi.ts / subscriptionApi.ts.
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/data/mockData";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const REQUEST_TIMEOUT_MS = 8000;

export interface CartEntry {
  productId: string;
  quantity: number;
  product: Product | null;
  updatedAt: string;
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

export async function fetchCart(): Promise<CartEntry[]> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/cart`, {
      headers: { "Content-Type": "application/json", ...headers },
      cache: "no-store",
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return data.cart as CartEntry[];
  } catch (err) {
    console.warn("[cartApi] fetchCart failed:", err);
  }
  return [];
}

export async function addToCart(
  productId: string,
  quantity?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/cart`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ productId, quantity }),
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return { success: true };
    return { success: false, error: data?.error || "Could not add to cart." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not reach backend server." };
  }
}

export async function updateCartQty(
  productId: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/cart/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ quantity }),
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return { success: true };
    return { success: false, error: data?.error || "Could not update quantity." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not reach backend server." };
  }
}

export async function removeFromCart(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/cart/${productId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...headers },
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return { success: true };
    return { success: false, error: data?.error || "Could not remove item." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not reach backend server." };
  }
}

export async function clearCart(): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/cart`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...headers },
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return { success: true };
    return { success: false, error: data?.error || "Could not clear cart." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not reach backend server." };
  }
}
