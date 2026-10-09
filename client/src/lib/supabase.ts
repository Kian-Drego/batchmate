import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  // Fail loudly in dev; a misconfigured production build should never ship.
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set (see client/.env.example)');
}

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});

/** Normalise Supabase/PostgREST/Function errors into a readable Error. */
export async function toError(err: unknown): Promise<Error & { details?: unknown }> {
  const anyErr = err as { message?: string; details?: string; context?: Response };
  // FunctionsHttpError carries the Response in `context`.
  if (anyErr?.context instanceof Response) {
    try {
      const body = await anyErr.context.clone().json();
      return Object.assign(new Error(body.error ?? 'Request failed'), { details: body.details });
    } catch {
      /* fall through */
    }
  }
  let details: unknown;
  if (anyErr?.details) {
    try {
      details = JSON.parse(anyErr.details);
    } catch {
      details = anyErr.details;
    }
  }
  return Object.assign(new Error(anyErr?.message ?? 'Something went wrong'), { details });
}
