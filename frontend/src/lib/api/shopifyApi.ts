import { createClient } from "@/lib/supabase/client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const REQUEST_TIMEOUT_MS = 8000;

export interface ShopifyIntegrationState {
  connected: boolean;
  shopDomain: string;
  storeName: string;
  currency: string;
  connectedAt?: string;
  lastSyncedAt?: string;
  syncedProductsCount: number;
  syncPreferences: {
    syncProducts: boolean;
    syncOrders: boolean;
    webhooksEnabled: boolean;
  };
}

export interface ConnectShopifyPayload {
  shopDomain: string;
  accessToken: string;
  apiSecretKey?: string;
  syncPreferences?: {
    syncProducts: boolean;
    syncOrders: boolean;
    webhooksEnabled: boolean;
  };
}

const DEFAULT_STATE: ShopifyIntegrationState = {
  connected: false,
  shopDomain: "",
  storeName: "",
  currency: "USD",
  syncedProductsCount: 0,
  syncPreferences: {
    syncProducts: true,
    syncOrders: true,
    webhooksEnabled: true,
  },
};

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Wraps fetch with a timeout so a sleeping/cold-starting backend can never hang the UI indefinitely. */
async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function isTimeout(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

export async function fetchShopifyStatus(): Promise<ShopifyIntegrationState & { timedOut?: boolean }> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/shopify/status`, {
      method: "GET",
      headers: { "Content-Type": "application/json", ...headers },
      cache: "no-store",
    });
    if (res.ok) {
      const data: ShopifyIntegrationState = await res.json();
      return data;
    }
  } catch (err) {
    if (isTimeout(err)) {
      console.warn("[shopifyApi] status request timed out — backend may be waking up.");
      return { ...DEFAULT_STATE, timedOut: true };
    }
    console.warn("[shopifyApi] status request failed:", err);
  }

  return DEFAULT_STATE;
}

export async function verifyShopifyConnection(payload: {
  shopDomain: string;
  accessToken: string;
}): Promise<{ success: boolean; shop?: any; error?: string; timedOut?: boolean }> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/shopify/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) return data;
    return { success: false, error: data.error || "Verification failed" };
  } catch (err: any) {
    if (isTimeout(err)) {
      return { success: false, timedOut: true, error: "Backend is waking up — please try again in a few seconds." };
    }
    return { success: false, error: "Could not reach backend server." };
  }
}

export async function connectShopifyStore(
  payload: ConnectShopifyPayload
): Promise<{ success: boolean; message?: string; error?: string; timedOut?: boolean }> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/shopify/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) return data;
    return { success: false, error: data.error || "Could not connect Shopify store." };
  } catch (err: any) {
    if (isTimeout(err)) {
      return { success: false, timedOut: true, error: "Backend is waking up — please try again in a few seconds." };
    }
    return { success: false, error: "Could not reach backend server." };
  }
}

export async function syncShopifyProducts(): Promise<{
  success: boolean;
  productsCount?: number;
  message?: string;
  error?: string;
  timedOut?: boolean;
}> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/shopify/sync-products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
    });
    const data = await res.json();
    if (res.ok) return data;
    return { success: false, error: data.error || "Sync failed." };
  } catch (err: any) {
    if (isTimeout(err)) {
      return { success: false, timedOut: true, error: "Backend is waking up — please try again in a few seconds." };
    }
    return { success: false, error: "Could not reach backend server." };
  }
}

export async function disconnectShopifyStore(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/shopify/disconnect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
    });
    const data = await res.json();
    if (res.ok) return data;
    return { success: false, error: data.error || "Could not disconnect." };
  } catch (err) {
    return { success: false, error: "Could not reach backend server." };
  }
}

export async function createShopifyProduct(productPayload: {
  title: string;
  body_html: string;
  vendor?: string;
  product_type?: string;
  tags?: string;
  price?: string;
  inventory_quantity?: number;
  images?: Array<{ src: string }>;
}): Promise<{ success: boolean; message?: string; product?: any; shopifyAdminUrl?: string; error?: string }> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/shopify/create-product`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(productPayload),
    });
    const data = await res.json();
    if (res.ok) {
      return data;
    }
    return { success: false, error: data.error || `Shopify creation failed (${res.status})` };
  } catch (err: any) {
    if (isTimeout(err)) {
      return { success: false, error: "Backend is waking up — please try again in a few seconds." };
    }
    return {
      success: false,
      error: "Could not reach backend server.",
    };
  }
}
