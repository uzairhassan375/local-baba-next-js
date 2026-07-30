// Notifications go through the Flask backend (shared with the mobile app),
// never direct Supabase — same convention as shopifyApi.ts / subscriptionApi.ts.
import { createClient } from "@/lib/supabase/client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const REQUEST_TIMEOUT_MS = 8000;

export interface NotificationEntry {
  id: string;
  type: string;
  title: string;
  body: string;
  icon: string | null;
  relatedId: string | null;
  isRead: boolean;
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

export async function fetchNotifications(): Promise<NotificationEntry[]> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/notifications`, {
      headers: { "Content-Type": "application/json", ...headers },
      cache: "no-store",
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return data.notifications as NotificationEntry[];
  } catch (err) {
    console.warn("[notificationsApi] fetchNotifications failed:", err);
  }
  return [];
}

export async function markNotificationRead(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return { success: true };
    return { success: false, error: data?.error || "Could not mark as read." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not reach backend server." };
  }
}

export async function markAllNotificationsRead(): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/notifications/mark-all-read`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return { success: true };
    return { success: false, error: data?.error || "Could not mark all as read." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not reach backend server." };
  }
}

export async function deleteNotification(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/notifications/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...headers },
    });
    const data = await safeJson(res);
    if (res.ok && data?.success) return { success: true };
    return { success: false, error: data?.error || "Could not delete notification." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not reach backend server." };
  }
}
