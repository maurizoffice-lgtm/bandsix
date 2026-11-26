// AI proxy: the browser sends the prompt built by the trainer engine, the server
// checks login, quota and size, calls Claude and returns the parsed JSON.
import Anthropic from '@anthropic-ai/sdk';
import { type Env, json, verifyUser, takeQuota } from '../_lib/env';

const MAX_PROMPT_CHARS = 24_000;
// Only the trainer's own prompt families are accepted, so the endpoint is not a general chatbot.
const KINDS: Array<{ kind: 'grade' | 'generate'; prefix: string }> = [
  { kind: 'grade', prefix: 'You are an experienced TOEFL iBT rater' },
  { kind: 'grade', prefix: 'You are an experienced TOEFL iBT speaking rater' },
  { kind: 'generate', prefix: 'You write original practice items for the 2026 TOEFL iBT' },
];

function parseJson(text: string): unknown {
  const t = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try { return JSON.parse(t); } catch { /* fall through */ }
  const start = t.search(/[[{]/);
  const end = Math.max(t.lastIndexOf(']'), t.lastIndexOf('}'));
  if (start >= 0 && end > start) return JSON.parse(t.slice(start, end + 1));
  throw new Error('no json');
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.ANTHROPIC_API_KEY) return json({ code: 'not_configured' }, 503);
  const user = await verifyUser(request, env);
  if (!user) return json({ code: 'unauthorized' }, 401);

  const len = Number(request.headers.get('content-length') || 0);
  if (len > MAX_PROMPT_CHARS * 4) return json({ code: 'too_large' }, 413);
  let body: { prompt?: unknown };
  try { body = await request.json(); } catch { return json({ code: 'bad_request' }, 400); }
  const prompt = typeof body.prompt === 'string' ? body.prompt : '';
  if (!prompt || prompt.length > MAX_PROMPT_CHARS) return json({ code: 'too_large' }, 413);
  const match = KINDS.find((k) => prompt.startsWith(k.prefix));
  if (!match) return json({ code: 'bad_request' }, 400);

  if (!(await takeQuota(env, user.token, match.kind))) return json({ code: 'rate_limited' }, 429);

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const model = match.kind === 'grade' ? env.MODEL_GRADE || 'claude-sonnet-5-5' : env.MODEL_GENERATE || 'claude-sonnet-5-5';
  try {
    const msg = await client.beta.messages.create({
      model,
      max_tokens: 16000,
      output_config: { effort: 'medium' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages: [{ role: 'user', content: prompt }],
    });
    if (msg.stop_reason === 'refusal') return json({ code: 'refused' }, 502);
    const text = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    return json({ result: parseJson(text) });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ code: 'rate_limited' }, 429);
    if (e instanceof Anthropic.APIError) return json({ code: 'upstream_error', status: e.status }, 502);
    return json({ code: 'invalid_json' }, 502);
  }
};
