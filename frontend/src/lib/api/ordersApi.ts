// Orders go through the Flask backend (shared with the mobile app), never
// direct Supabase — same convention as shopifyApi.ts / subscriptionApi.ts.
// This is also what makes order-lifecycle notifications (order placed,
// payment confirmed, dispatched, etc.) actually fire: those are created
// server-side inside these same backend endpoints.
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/data/mockData";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const REQUEST_TIMEOUT_MS = 8000;

export interface CreateOrderPayload {
  customerName?: string;
  items: Order["items"];
  total: number;
  deliveryCharges?: number;
  discount?: number;
  paymentMethod: string;
  deliveryAddress: string;
  city: string;
  notes?: string;
  paymentScreenshot?: string;
  transactionRef?: string;
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

export async function fetchOrders(): Promise<Order[]> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/orders`, {
      headers: { "Content-Type": "application/json", ...headers },
      cache: "no-store",
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return data.orders as Order[];
  } catch (err) {
    console.warn("[ordersApi] fetchOrders failed:", err);
  }
  return [];
}

export async function fetchOrderById(id: string): Promise<Order | null> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/orders/${id}`, {
      headers: { "Content-Type": "application/json", ...headers },
      cache: "no-store",
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return data.order as Order;
  } catch (err) {
    console.warn("[ordersApi] fetchOrderById failed:", err);
  }
  return null;
}

export async function createOrder(
  payload: CreateOrderPayload
): Promise<{ success: boolean; order?: Order; error?: string }> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(payload),
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return { success: true, order: data.order as Order };
    return { success: false, error: data?.error || "Could not place order." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not reach backend server." };
  }
}

export async function updateOrder(
  id: string,
  patch: Record<string, unknown>
): Promise<{ success: boolean; order?: Order; error?: string }> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(patch),
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return { success: true, order: data.order as Order };
    return { success: false, error: data?.error || "Could not update order." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not reach backend server." };
  }
}
