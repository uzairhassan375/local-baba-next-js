/** True when stored Supabase session cannot be refreshed — clear cookies / sign out. */
export function isCorruptAuthSessionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const msg = String((error as { message?: string }).message ?? "");
  const code = String((error as { code?: string }).code ?? "");
  const combined = `${msg} ${code}`.toLowerCase();
  return (
    combined.includes("refresh token not found") ||
    combined.includes("invalid refresh token") ||
    combined.includes("refresh_token_not_found")
  );
}
