import type { AuthError } from "@supabase/supabase-js";

/** User-facing copy for Supabase Auth errors on member sign-in. */
export function memberSignInErrorMessage(error: AuthError | null | undefined, fallback: string): string {
  if (!error) return fallback;
  const c = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();

  if (c === "email_not_confirmed" || msg.includes("email not confirmed")) {
    return "Please confirm your email using the link we sent you, then sign in again.";
  }
  if (msg.includes("invalid login credentials") || c === "invalid_credentials") {
    return "Wrong email or password. Check your details and try again.";
  }
  if (msg.includes("user not found") || c === "user_not_found") {
    return "No account found for this email. Register first, then sign in.";
  }

  const trimmed = error.message?.trim();
  return trimmed || fallback;
}
