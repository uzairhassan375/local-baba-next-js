// Promo codes go through the Flask backend, never direct Supabase — same
// convention as cartApi.ts / favoritesApi.ts / notificationsApi.ts.
import { createClient } from "@/lib/supabase/client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const REQUEST_TIMEOUT_MS = 8000;

export type DiscountType = "percent" | "fixed";

export interface AdminPromo {
  id: string;
  code: string;
  productId: string | null;
  discountType: DiscountType;
  discountValue: number;
  minQuantity: number;
  expiresAt: string | null;
}

export interface AppliedPromo {
  code: string;
  productId: string | null;
  discountType: DiscountType;
  discountValue: number;
  minQuantity: number;
  expiresAt: string | null;
}

export interface EligibleMember {
  authUserId: string;
  name: string | null;
  email: string | null;
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

/** Admin-only — approved members, optionally filtered by city. Used by the
 * standalone "Promo Codes" tool to target recipients by city rather than by
 * cart/favourites membership. */
export async function fetchEligibleMembers(city?: string): Promise<EligibleMember[]> {
  try {
    const headers = await authHeaders();
    const url = new URL(`${BACKEND_URL}/api/promo-codes/admin/eligible-members`);
    if (city) url.searchParams.set("city", city);
    const res = await fetchWithTimeout(url.toString(), {
      headers: { "Content-Type": "application/json", ...headers },
      cache: "no-store",
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return data.members as EligibleMember[];
  } catch (err) {
    console.warn("[promoCodesApi] fetchEligibleMembers failed:", err);
  }
  return [];
}

/** Admin-only — create a promo code scoped to exactly these members. */
export async function createAdminPromoCode(params: {
  memberIds: string[];
  productId?: string;
  discountType: DiscountType;
  discountValue: number;
  /** Custom code text, e.g. "FIRSTORDER" — omit to auto-generate one. */
  code?: string;
  /** Minimum quantity of the product required in cart to redeem — 0/omit = no minimum. */
  minQuantity?: number;
  /** How many days the code stays valid from creation — omit for the backend's 7-day default, 0 = never expires. */
  validDays?: number;
}): Promise<{ success: boolean; promo?: AdminPromo; error?: string }> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/promo-codes/admin/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(params),
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return { success: true, promo: data.promo as AdminPromo };
    return { success: false, error: data?.error || "Could not create promo code." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not reach backend server." };
  }
}

/** Admin-only — active promo codes for every product that has one, keyed by productId. */
export async function fetchAdminActivePromoCounts(): Promise<Record<string, AdminPromo>> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/promo-codes/admin/product-counts`, {
      headers: { "Content-Type": "application/json", ...headers },
      cache: "no-store",
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return data.promos as Record<string, AdminPromo>;
  } catch (err) {
    console.warn("[promoCodesApi] fetchAdminActivePromoCounts failed:", err);
  }
  return {};
}

/** Admin-only — deactivate a promo code so it can no longer be redeemed. */
export async function disableAdminPromoCode(promoId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/promo-codes/admin/${promoId}/disable`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return { success: true };
    return { success: false, error: data?.error || "Could not disable promo code." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not reach backend server." };
  }
}

/** Member-facing — validates a code for the current member at checkout. */
export async function applyPromoCode(code: string): Promise<{ success: boolean; promo?: AppliedPromo; error?: string }> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/promo-codes/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ code }),
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return { success: true, promo: data.promo as AppliedPromo };
    return { success: false, error: data?.error || "Invalid promo code." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not reach backend server." };
  }
}
