export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  ANTHROPIC_API_KEY: string;
  /** optional overrides */
  MODEL_GRADE?: string;
  MODEL_GENERATE?: string;
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

/** Checks the Supabase login token. Returns the user id or null. */
export async function verifyUser(req: Request, env: Env): Promise<{ id: string; token: string } | null> {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || token.length > 4096) return null;
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const u = (await r.json()) as { id?: string };
  return u.id ? { id: u.id, token } : null;
}

/** Takes one AI call from the user's quota (limits live in the database function). */
export async function takeQuota(env: Env, token: string, kind: string): Promise<boolean> {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/take_ai_quota`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ p_kind: kind }),
  });
  if (!r.ok) return false;
  return (await r.json()) === true;
}
