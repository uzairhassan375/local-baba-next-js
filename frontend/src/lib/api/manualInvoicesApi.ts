// Member manual invoices go through the Flask backend, never direct
// Supabase — same convention as ordersApi.ts / invoiceSettingsApi.ts.
import { createClient } from "@/lib/supabase/client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const REQUEST_TIMEOUT_MS = 8000;

export interface ManualInvoiceItem {
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface ManualInvoiceRecord {
  id: string;
  memberId: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string | null;
  deliveryAddress: string;
  city: string;
  items: ManualInvoiceItem[];
  subtotal: number;
  deliveryCharges: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: "pending" | "confirmed" | "failed";
  dueDate?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface CreateManualInvoicePayload {
  customerName: string;
  customerPhone?: string;
  deliveryAddress?: string;
  city?: string;
  items: { description: string; qty: number; rate: number }[];
  deliveryCharges?: number;
  discount?: number;
  paymentMethod: string;
  paymentStatus: "pending" | "confirmed" | "failed";
  dueDate?: string;
  notes?: string;
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

export async function fetchManualInvoices(): Promise<ManualInvoiceRecord[]> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/manual-invoices`, {
      headers: { "Content-Type": "application/json", ...headers },
      cache: "no-store",
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return data.invoices as ManualInvoiceRecord[];
  } catch (err) {
    console.warn("[manualInvoicesApi] fetchManualInvoices failed:", err);
  }
  return [];
}

export async function fetchManualInvoiceById(id: string): Promise<ManualInvoiceRecord | null> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/manual-invoices/${id}`, {
      headers: { "Content-Type": "application/json", ...headers },
      cache: "no-store",
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return data.invoice as ManualInvoiceRecord;
  } catch (err) {
    console.warn("[manualInvoicesApi] fetchManualInvoiceById failed:", err);
  }
  return null;
}

export async function createManualInvoice(
  payload: CreateManualInvoicePayload
): Promise<{ success: boolean; invoice?: ManualInvoiceRecord; error?: string }> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/manual-invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(payload),
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return { success: true, invoice: data.invoice as ManualInvoiceRecord };
    return { success: false, error: data?.error || "Could not create invoice." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not reach backend server." };
  }
}

export async function deleteManualInvoice(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/manual-invoices/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...headers },
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return { success: true };
    return { success: false, error: data?.error || "Could not delete invoice." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not reach backend server." };
  }
}
