import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Application, Member } from "@/data/mockData";

type ApplicationRow = {
  id: string;
  name: string;
  whatsapp: string;
  city: string;
  business_name: string;
  sells_what: unknown;
  sells_where: unknown;
  monthly_volume: string;
  heard_from: string;
  applied_at: string;
  status: Application["status"];
  decided_at: string | null;
  auth_user_id?: string | null;
  email?: string | null;
};

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

export function mapRowToApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    name: row.name,
    whatsapp: row.whatsapp,
    city: row.city,
    businessName: row.business_name,
    sellsWhat: asStringArray(row.sells_what),
    sellsWhere: asStringArray(row.sells_where),
    monthlyVolume: row.monthly_volume,
    heardFrom: row.heard_from || "",
    appliedAt: row.applied_at,
    status: row.status,
    email: row.email ?? undefined,
  };
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
  const supabase = createClient();
  const { error } = await supabase.from("membership_applications").insert({
    ...payload,
    status: "pending",
  });
  if (error) throw error;
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

  const supabase = createClient();
  const uid = session.user.id;

  const { error } = await supabase.from("membership_applications").insert({
    ...rest,
    email,
    auth_user_id: uid,
    status: "approved",
    decided_at: new Date().toISOString(),
  });

  if (error) {
    // Row may already exist (e.g. retry) — treat unique violations as success
    if (error.code !== "23505") {
      console.error("Membership insert from signup metadata failed:", error.message);
      return false;
    }
  }

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

  const uid = data.user.id;
  const { error: insErr } = await supabase.from("membership_applications").insert({
    ...rest,
    email: emailNorm,
    auth_user_id: uid,
    status: "approved",
    decided_at: new Date().toISOString(),
  });
  if (insErr) {
    await supabase.auth.signOut();
    throw insErr;
  }

  await supabase.auth.updateUser({ data: { [REGISTRATION_META_KEY]: null } }).catch(() => undefined);

  return { flow: "session_ready" };
}

export async function fetchMyMembershipApplicationForUser(userId: string): Promise<Application | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("membership_applications")
    .select("*")
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapRowToApplication(data as ApplicationRow);
}

export async function fetchMembershipApplications(): Promise<Application[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("membership_applications")
    .select("*")
    .order("applied_at", { ascending: false });
  if (error) throw error;
  return (data as ApplicationRow[]).map(mapRowToApplication);
}

export async function updateApplicationStatus(
  id: string,
  status: "approved" | "rejected",
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("membership_applications")
    .update({ status, decided_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export type MemberProfileUpdate = {
  name: string;
  whatsapp: string;
  city: string;
  business_name: string;
};

export async function updateMemberProfile(userId: string, payload: MemberProfileUpdate): Promise<Application> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("membership_applications")
    .update({
      name: payload.name.trim(),
      whatsapp: payload.whatsapp.replace(/\D/g, ""),
      city: payload.city,
      business_name: payload.business_name.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("auth_user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return mapRowToApplication(data as ApplicationRow);
}
