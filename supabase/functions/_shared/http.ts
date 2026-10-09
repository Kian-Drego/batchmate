import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowAny = ALLOWED_ORIGINS.includes('*');
  const allow = allowAny ? origin || '*' : ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

/** Service-role client: bypasses RLS. Only ever used server-side. */
export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function bearer(req: Request): string | null {
  return req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || null;
}

/** Resolve the calling user from their access token, or throw 401. */
export async function requireUser(req: Request, admin: SupabaseClient): Promise<User> {
  const token = bearer(req);
  if (!token) throw new HttpError(401, 'Authentication required');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Invalid or expired session');
  return data.user;
}

/** Constant-time string comparison for shared secrets. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function handle(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
    try {
      return await fn(req);
    } catch (err) {
      if (err instanceof HttpError) return json(req, { error: err.message, details: err.details }, err.status);
      if (err instanceof Error && err.name === 'SensitiveFieldError') return json(req, { error: err.message }, 400);
      console.error(err);
      return json(req, { error: 'Internal error' }, 500);
    }
  };
}
