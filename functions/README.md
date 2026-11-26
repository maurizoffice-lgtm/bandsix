# Server part (not active yet)

These Cloudflare Pages Functions are prepared for the public phase and are **not used** on GitHub Pages.

- `api/ai.ts`: AI proxy for Writing/Interview grading and item generation (Anthropic API). Checks the Supabase login, a per-user quota (`supabase/schema.sql`) and input size. Only the trainer's own prompt families are accepted.

To activate later: host on Cloudflare Pages, set the secrets `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, run `supabase/schema.sql`, add a login to the frontend and set `VITE_AI_ENDPOINT=/api/ai` at build time.
