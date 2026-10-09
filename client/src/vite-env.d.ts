/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  /** Publishable (anon) key — safe in the browser; data is protected by RLS. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  /** "true" to show the Google sign-in button (provider must be enabled in Supabase). */
  readonly VITE_GOOGLE_AUTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
