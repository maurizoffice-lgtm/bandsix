-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

-- 1) Per-user documents (progress profile, sessions, generated items, analysis).
create table if not exists public.user_docs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  path text not null check (char_length(path) between 3 and 200),
  data jsonb not null check (pg_column_size(data) < 512000),
  updated_at timestamptz not null default now(),
  primary key (user_id, path)
);
alter table public.user_docs enable row level security;

drop policy if exists "own docs select" on public.user_docs;
drop policy if exists "own docs insert" on public.user_docs;
drop policy if exists "own docs update" on public.user_docs;
drop policy if exists "own docs delete" on public.user_docs;
create policy "own docs select" on public.user_docs for select to authenticated using (auth.uid() = user_id);
create policy "own docs insert" on public.user_docs for insert to authenticated with check (auth.uid() = user_id);
create policy "own docs update" on public.user_docs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own docs delete" on public.user_docs for delete to authenticated using (auth.uid() = user_id);

-- 2) AI call log for the per-user rate limit. No policies: only the function below writes it.
create table if not exists public.ai_calls (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_calls_user_time on public.ai_calls (user_id, created_at desc);
alter table public.ai_calls enable row level security;

-- Limits: 20 calls per hour and 80 per day per user (change the numbers here).
create or replace function public.take_ai_quota(p_kind text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  last_hour int;
  last_day int;
begin
  if uid is null then return false; end if;
  select count(*) filter (where created_at > now() - interval '1 hour'),
         count(*)
    into last_hour, last_day
    from ai_calls where user_id = uid and created_at > now() - interval '1 day';
  if last_hour >= 20 or last_day >= 80 then return false; end if;
  insert into ai_calls (user_id, kind) values (uid, left(p_kind, 20));
  return true;
end;
$$;
revoke all on function public.take_ai_quota(text) from public, anon;
grant execute on function public.take_ai_quota(text) to authenticated;
