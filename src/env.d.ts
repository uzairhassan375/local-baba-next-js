namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
    /** Must match Supabase Auth admin user; used client-side for routing checks only. */
    NEXT_PUBLIC_ADMIN_EMAIL?: string;
    /** Bunny.net storage zone FTP & API password (full access — not read-only). */
    BUNNY_STORAGE_API_KEY?: string;
    /** e.g. https://sg.storage.bunnycdn.com/your-storage-zone-name */
    BUNNY_STORAGE_API_BASE?: string;
    /** Pull zone origin, e.g. https://cdn.example.com — no trailing slash */
    BUNNY_STORAGE_CDN_BASE?: string;
    /** Google AI Studio / Gemini API key (server-only). Used for images + listing copy. */
    GEMINI_API_KEY?: string;
  }
}
