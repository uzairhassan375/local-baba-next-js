import { createClient } from "@/lib/supabase/client";

export interface ChinaDeliveryPrice {
  id: string;
  category: string;
  deliveryPrice: number;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchChinaDeliveryPrices(): Promise<ChinaDeliveryPrice[]> {
  const res = await fetch(`${BACKEND_URL}/api/china-delivery-prices`, { cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; prices?: ChinaDeliveryPrice[]; error?: string };
  if (!res.ok || !body.success) throw new Error(body.error || "Could not load China delivery prices.");
  return body.prices || [];
}

export async function upsertChinaDeliveryPrice(category: string, deliveryPrice: number): Promise<ChinaDeliveryPrice> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/china-delivery-prices`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ category, deliveryPrice }),
  });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; price?: ChinaDeliveryPrice; error?: string };
  if (!res.ok || !body.success || !body.price) throw new Error(body.error || "Could not save delivery price.");
  return body.price;
}

export async function deleteChinaDeliveryPrice(id: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/china-delivery-prices/${id}`, { method: "DELETE", headers });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
  if (!res.ok || !body.success) throw new Error(body.error || "Could not delete delivery price.");
}

export function deliveryPriceForCategory(
  prices: ChinaDeliveryPrice[],
  category: string,
): number | null {
  const match = prices.find(p => p.category.toLowerCase() === category.toLowerCase());
  return match ? match.deliveryPrice : null;
}
