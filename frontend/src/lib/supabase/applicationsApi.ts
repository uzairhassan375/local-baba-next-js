import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Application, Member } from "@/data/mockData";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type ApiApplicationRow = {
  id: string;
  name: string;
  whatsapp: string;
  city: string;
  businessName: string;
  sellsWhat: unknown;
  sellsWhere: unknown;
  monthlyVolume: string;
  heardFrom: string;
  appliedAt: string;
  status: Application["status"];
  email?: string | null;
};

function mapApiRowToApplication(row: ApiApplicationRow): Application {
  return {
    id: row.id,
    name: row.name,
    whatsapp: row.whatsapp,
    city: row.city,
    businessName: row.businessName,
    sellsWhat: asStringArray(row.sellsWhat),
    sellsWhere: asStringArray(row.sellsWhere),
    monthlyVolume: row.monthlyVolume,
    heardFrom: row.heardFrom || "",
    appliedAt: row.appliedAt,
    status: row.status,
    email: row.email ?? undefined,
  };
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

export function applicationToMember(app: Application): Member {
  let joinedDate = "—";
  try {
    joinedDate = new Date(app.appliedAt).toLocaleDateString(undefined, { year: "numeric", month: "short" });
  } catch {
    /* ignore */
  }
  return {
    id: app.id,
    name: app.name,
    city: app.city,
    whatsapp: app.whatsapp,
    joinedDate,
    totalOrders: 0,
    totalSpent: 0,
    savedVsMarket: 0,
    status: "active",
    email: app.email,
  };
}

export type NewApplicationPayload = {
  name: string;
  whatsapp: string;
  city: string;
  business_name: string;
  sells_what: string[];
  sells_where: string[];
  monthly_volume: string;
  heard_from: string;
};

export async function submitMembershipApplication(payload: NewApplicationPayload): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      name: payload.name,
      whatsapp: payload.whatsapp,
      city: payload.city,
      businessName: payload.business_name,
      sellsWhat: payload.sells_what,
      sellsWhere: payload.sells_where,
      monthlyVolume: payload.monthly_volume,
      heardFrom: payload.heard_from,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
  if (!res.ok || !body.success) throw new Error(body.error || "Could not submit application.");
}

/** Creates the auto-approved membership row right after signup, using the
 * given session's own token directly rather than re-reading it from
 * storage — avoids any race with a session that was just minted. */
async function registerMembership(session: Session, rest: NewApplicationPayload): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/applications/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({
      name: rest.name,
      whatsapp: rest.whatsapp,
      city: rest.city,
      businessName: rest.business_name,
      sellsWhat: rest.sells_what,
      sellsWhere: rest.sells_where,
      monthlyVolume: rest.monthly_volume,
      heardFrom: rest.heard_from,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
  if (!res.ok || !body.success) throw new Error(body.error || "Could not register membership.");
}

export type RegisterMemberPayload = NewApplicationPayload & {
  email: string;
  password: string;
};

/** Stored on the auth user when email confirmation is required (no session yet → DB insert happens on first login). */
const REGISTRATION_META_KEY = "tlb_registration" as const;

export type RegisterMemberResult =
  | { flow: "session_ready" }
  | { flow: "awaiting_email_confirmation" };

function registrationMetaFromPayload(rest: NewApplicationPayload): Record<string, unknown> {
  return {
    name: rest.name,
    whatsapp: rest.whatsapp,
    city: rest.city,
    business_name: rest.business_name,
    sells_what: rest.sells_what,
    sells_where: rest.sells_where,
    monthly_volume: rest.monthly_volume,
    heard_from: rest.heard_from,
  };
}

function parseRegistrationMeta(raw: unknown): NewApplicationPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const sellsWhat = asStringArray(o.sells_what);
  const sellsWhere = asStringArray(o.sells_where);
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const whatsapp = typeof o.whatsapp === "string" ? o.whatsapp.replace(/\D/g, "") : "";
  const city = typeof o.city === "string" ? o.city : "";
  const businessName = typeof o.business_name === "string" ? o.business_name.trim() : "";
  const monthlyVolume = typeof o.monthly_volume === "string" ? o.monthly_volume : "";
  const heardFrom = typeof o.heard_from === "string" ? o.heard_from.trim() : "";
  if (!name || !whatsapp || !city || !businessName || sellsWhat.length === 0 || sellsWhere.length === 0 || !monthlyVolume) {
    return null;
  }
  return {
    name,
    whatsapp,
    city,
    business_name: businessName,
    sells_what: sellsWhat,
    sells_where: sellsWhere,
    monthly_volume: monthlyVolume,
    heard_from: heardFrom,
  };
}

/**
 * If the user confirmed email but never got a DB row (signup had no session),
 * create `membership_applications` from `user_metadata.tlb_registration`.
 */
export async function tryInsertMembershipFromSignupMetadata(session: Session): Promise<boolean> {
  const raw = session.user.user_metadata?.[REGISTRATION_META_KEY];
  const rest = parseRegistrationMeta(raw);
  if (!rest) return false;

  const email = session.user.email?.trim().toLowerCase();
  if (!email) return false;

  try {
    await registerMembership(session, rest);
  } catch (err) {
    // The backend treats "row already exists" (e.g. retry) as success too,
    // so a thrown error here means a genuine failure.
    console.error("Membership insert from signup metadata failed:", err);
    return false;
  }

  const supabase = createClient();
  const { error: metaErr } = await supabase.auth.updateUser({
    data: { [REGISTRATION_META_KEY]: null },
  });
  if (metaErr) {
    console.warn("Could not clear signup metadata:", metaErr.message);
  }

  return true;
}

/**
 * Creates Supabase Auth user with profile in `user_metadata`.
 * If a session is returned (email confirmation off), inserts membership immediately.
 * If not (email confirmation on), membership is inserted on first sign-in via `tryInsertMembershipFromSignupMetadata`.
 */
export async function registerMember(payload: RegisterMemberPayload): Promise<RegisterMemberResult> {
  const reserved = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase();
  const emailNorm = payload.email.trim().toLowerCase();
  if (reserved && emailNorm === reserved) {
    throw new Error("This email is reserved for admin.");
  }

  const supabase = createClient();
  const { email, password, ...rest } = payload;
  const meta = registrationMetaFromPayload(rest);

  const { data, error } = await supabase.auth.signUp({
    email: emailNorm,
    password,
    options: {
      data: { [REGISTRATION_META_KEY]: meta },
    },
  });
  if (error) throw error;
  if (!data.user) throw new Error("Registration failed.");

  if (!data.session) {
    return { flow: "awaiting_email_confirmation" };
  }

  try {
    await registerMembership(data.session, rest);
  } catch (err) {
    await supabase.auth.signOut();
    throw err;
  }

  await supabase.auth.updateUser({ data: { [REGISTRATION_META_KEY]: null } }).catch(() => undefined);

  return { flow: "session_ready" };
}

/** `userId` is unused (identity is derived from the bearer token
 * server-side) but kept in the signature since every call site already has
 * it and it documents that this fetches the *caller's own* application. */
export async function fetchMyMembershipApplicationForUser(userId: string): Promise<Application | null> {
  void userId;
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/profile`, { headers, cache: "no-store" });
  if (res.status === 404) return null;
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; profile?: ApiApplicationRow; error?: string };
  if (!res.ok || !body.success || !body.profile) return null;
  return mapApiRowToApplication(body.profile);
}

export async function fetchMembershipApplications(): Promise<Application[]> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/applications`, { headers, cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; applications?: ApiApplicationRow[]; error?: string };
  if (!res.ok || !body.success) throw new Error(body.error || "Could not load applications.");
  return (body.applications || []).map(mapApiRowToApplication);
}

export async function updateApplicationStatus(
  id: string,
  status: "approved" | "rejected",
): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/applications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ status }),
  });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
  if (!res.ok || !body.success) throw new Error(body.error || "Could not update application status.");
}

export type MemberProfileUpdate = {
  name: string;
  whatsapp: string;
  city: string;
  business_name: string;
};

/** `userId` is unused (identity is derived from the bearer token
 * server-side) but kept in the signature to match the caller. */
export async function updateMemberProfile(userId: string, payload: MemberProfileUpdate): Promise<Application> {
  void userId;
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      name: payload.name,
      whatsapp: payload.whatsapp,
      city: payload.city,
      businessName: payload.business_name,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; profile?: ApiApplicationRow; error?: string };
  if (!res.ok || !body.success || !body.profile) throw new Error(body.error || "Could not update profile.");
  return mapApiRowToApplication(body.profile);
}
