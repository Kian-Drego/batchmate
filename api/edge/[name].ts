// Vercel serverless proxy for the Supabase Edge Functions (`exams`, `jobs`).
//
// Why this exists: the hosted Supabase functions restrict browser CORS to the
// app's legacy apex origin (ALLOWED_ORIGINS secret = https://batchmate.duckdns.org)
// while the app is served from https://www.batchmate.duckdns.org. Browsers on the
// www origin therefore fail the preflight for any direct function call
// ("net::ERR_FAILED" -> "Failed to send a request to the Edge Function").
// Proxying through this same-origin endpoint takes the browser out of the CORS
// equation entirely. The dev server mirrors the route via vite.config.ts.
//
// Auth: the browser forwards the user's session token in `Authorization`, and
// the upstream function validates it itself (requireUser + role checks).

const FUNCTIONS_BASE = 'https://tresgtfjlqxrixitafjv.supabase.co/functions/v1';

export const config = { maxDuration: 60 };

interface ReqLike {
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface ResLike {
  status(code: number): unknown;
  setHeader(name: string, value: string): unknown;
  send(payload: string): unknown;
}

export default async function handler(req: ReqLike, res: ResLike) {
  const name = String(req.query?.name ?? '').trim();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    res.status(400);
    res.send(JSON.stringify({ error: 'Bad function name' }));
    return;
  }

  const auth = req.headers?.authorization;
  const authorization = Array.isArray(auth) ? auth[0] : auth;
  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});

  let upstream: Response;
  try {
    upstream = await fetch(`${FUNCTIONS_BASE}/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body,
    });
  } catch (err) {
    res.status(502);
    res.send(JSON.stringify({ error: err instanceof Error ? err.message : 'Upstream unreachable' }));
    return;
  }

  const text = await upstream.text();
  res.status(upstream.status);
  res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
  res.send(text);
}