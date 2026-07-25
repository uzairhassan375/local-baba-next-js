// All subscription operations now go through Next.js API routes backed by Supabase.
// The Express backend subscription routes are no longer used.

export interface SubscriptionInfo {
  id?: string;
  user_email?: string;
  user_name?: string;
  userEmail: string;
  userName: string;
  payment_proof_url?: string;
  paymentProofUrl: string;
  amount: number;
  status: "pending" | "active" | "rejected" | "expired" | "none";
  bank_name?: string;
  account_title?: string;
  iban?: string;
  createdAt?: string;
  created_at?: string;
  confirmed_at?: string;
  updated_at?: string;
}

/** Normalise Supabase snake_case row into a SubscriptionInfo */
function normalise(row: any): SubscriptionInfo {
  return {
    id: row.id,
    user_email: row.user_email,
    user_name: row.user_name,
    userEmail: row.user_email ?? row.userEmail ?? "",
    userName: row.user_name ?? row.userName ?? "",
    payment_proof_url: row.payment_proof_url,
    paymentProofUrl: row.payment_proof_url ?? row.paymentProofUrl ?? "",
    amount: row.amount ?? 10,
    status: row.status ?? "none",
    bank_name: row.bank_name,
    account_title: row.account_title,
    iban: row.iban,
    created_at: row.created_at,
    createdAt: row.created_at ?? row.createdAt,
    confirmed_at: row.confirmed_at,
    updated_at: row.updated_at,
  };
}

/** Safe JSON parse — returns null if response is not JSON */
async function safeJson(res: Response): Promise<any | null> {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text().catch(() => "");
    console.error("[subscriptionApi] Non-JSON response:", res.status, text.slice(0, 200));
    return null;
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK STATUS
// ─────────────────────────────────────────────────────────────────────────────
export async function checkSubscriptionStatus(userEmail: string): Promise<{
  isSubscribed: boolean;
  status: "pending" | "active" | "rejected" | "expired" | "none";
  subscription?: SubscriptionInfo;
}> {
  if (!userEmail) return { isSubscribed: false, status: "none" };

  try {
    const res = await fetch(
      `/api/subscriptions/status?email=${encodeURIComponent(userEmail)}`,
      { cache: "no-store" }
    );
    const data = await safeJson(res);
    if (data) {
      return {
        isSubscribed: data.isSubscribed ?? data.status === "active",
        status: data.status ?? "none",
        subscription: data.subscription ? normalise(data.subscription) : undefined,
      };
    }
  } catch (err) {
    console.warn("[subscriptionApi] checkSubscriptionStatus failed:", err);
  }

  // Fallback: localStorage
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(`localbaba_subscription_${userEmail.toLowerCase()}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          isSubscribed: parsed.status === "active",
          status: parsed.status || "none",
          subscription: normalise(parsed),
        };
      }
    } catch {}
  }

  return { isSubscribed: false, status: "none" };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBMIT PAYMENT PROOF
// ─────────────────────────────────────────────────────────────────────────────
export async function submitPaymentProof(payload: {
  userEmail: string;
  userName?: string;
  paymentProofUrl: string;
  amount?: number;
}): Promise<{ success: boolean; message?: string; error?: string; subscription?: SubscriptionInfo }> {
  try {
    const res = await fetch("/api/subscriptions/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await safeJson(res);
    if (!data) return { success: false, error: "Server error — please try again." };

    if (res.ok && data.success) {
      const sub = normalise(data.subscription);
      // Persist to localStorage as offline cache
      if (typeof window !== "undefined") {
        localStorage.setItem(
          `localbaba_subscription_${payload.userEmail.toLowerCase()}`,
          JSON.stringify(sub)
        );
      }
      return { success: true, message: data.message, subscription: sub };
    }
    return { success: false, error: data.error || "Failed to submit payment proof." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to submit payment proof." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — FETCH ALL
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchAllSubscriptions(): Promise<SubscriptionInfo[]> {
  try {
    const res = await fetch("/api/subscriptions/list", { cache: "no-store" });
    const data = await safeJson(res);
    if (data?.subscriptions) return (data.subscriptions as any[]).map(normalise);
  } catch (err) {
    console.warn("[subscriptionApi] fetchAllSubscriptions failed:", err);
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — CONFIRM
// ─────────────────────────────────────────────────────────────────────────────
export async function confirmSubscriptionPayment(
  subscriptionId: string,
  userEmail: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch("/api/subscriptions/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionId, userEmail }),
    });
    const data = await safeJson(res);
    if (!data) return { success: false, error: "Server error." };
    return data;
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — REJECT
// ─────────────────────────────────────────────────────────────────────────────
export async function rejectSubscriptionPayment(
  subscriptionId: string,
  userEmail: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch("/api/subscriptions/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionId, userEmail }),
    });
    const data = await safeJson(res);
    if (!data) return { success: false, error: "Server error." };
    return data;
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
