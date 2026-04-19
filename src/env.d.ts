namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
    /** Must match Supabase Auth admin user; used client-side for routing checks only. */
    NEXT_PUBLIC_ADMIN_EMAIL?: string;
  }
}
