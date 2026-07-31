// Invoice branding (company name + logo) goes through the Flask backend,
// never direct Supabase — same convention as favoritesApi.ts / cartApi.ts.
// The logo image itself is uploaded via the existing admin-only
// /api/upload-media Next.js route (Bunny CDN), same as every other admin
// image upload in this app; only the resulting URL is saved via the backend.
import { createClient } from "@/lib/supabase/client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const REQUEST_TIMEOUT_MS = 8000;

export interface InvoiceSettings {
  companyName: string;
  logoUrl: string | null;
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

/** Uploads a logo image via the existing admin-only Bunny CDN upload route and returns its public URL. */
export async function uploadInvoiceLogo(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append("files", file);
    const res = await fetch("/api/upload-media", { method: "POST", body: formData });
    const data = await safeJson(res);
    if (res.ok && data?.urls?.[0]) return { success: true, url: data.urls[0] as string };
    return { success: false, error: data?.error || "Failed to upload logo." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to upload logo." };
  }
}
