// Invoice branding (company name + logo) goes through the Flask backend,
// never direct Supabase or Bunny CDN directly — same convention as
// favoritesApi.ts / cartApi.ts, and the same backend the Flutter app talks
// to, so both platforms hit the local backend when developing and the
// deployed (Render) one in production. The browser never holds Bunny
// credentials at all; only the Flask backend does.
//
// Admin edits the platform-wide default (the singleton row); members
// instead get their own row keyed by member_id, so each member can brand
// their own printed invoices without touching admin's default. `isCustom`
// tells you which one you're looking at.
import { createClient } from "@/lib/supabase/client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const REQUEST_TIMEOUT_MS = 8000;

export interface InvoiceSettings {
  companyName: string;
  logoUrl: string | null;
  isCustom?: boolean;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
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

const DEFAULT_SETTINGS: InvoiceSettings = { companyName: "Local Baba", logoUrl: null };

export async function fetchInvoiceSettings(): Promise<InvoiceSettings> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/invoice-settings`, {
      headers: { "Content-Type": "application/json", ...headers },
      cache: "no-store",
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return data.settings as InvoiceSettings;
  } catch (err) {
    console.warn("[invoiceSettingsApi] fetchInvoiceSettings failed:", err);
  }
  return DEFAULT_SETTINGS;
}

export async function updateInvoiceSettings(
  patch: Partial<InvoiceSettings>
): Promise<{ success: boolean; settings?: InvoiceSettings; error?: string }> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/invoice-settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(patch),
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return { success: true, settings: data.settings as InvoiceSettings };
    return { success: false, error: data?.error || "Could not update invoice settings." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not reach backend server." };
  }
}

export async function resetInvoiceSettings(): Promise<{ success: boolean; settings?: InvoiceSettings; error?: string }> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/invoice-settings`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...headers },
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return { success: true, settings: data.settings as InvoiceSettings };
    return { success: false, error: data?.error || "Could not reset invoice branding." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not reach backend server." };
  }
}

/** Uploads a logo image via the backend (which forwards it to Bunny CDN) and returns its public URL. */
export async function uploadInvoiceLogo(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const headers = await authHeaders();
    const formData = new FormData();
    formData.append("file", file);
    // Don't set Content-Type here — the browser needs to add its own
    // multipart boundary for FormData bodies.
    const res = await fetchWithTimeout(
      `${BACKEND_URL}/api/invoice-settings/logo`,
      { method: "POST", headers, body: formData },
      30000
    );
    const data = await safeJson(res);
    if (res.ok && data?.success && data?.url) return { success: true, url: data.url as string };
    return { success: false, error: data?.error || "Failed to upload logo." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to upload logo." };
  }
}
