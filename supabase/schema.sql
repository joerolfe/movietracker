-- Movie Tracker schema. Paste into Supabase → SQL Editor → New query, then Run.
-- Safe to run in a project you already use for something else: everything is prefixed movie_
-- and nothing else is touched. Safe to re-run.
--
-- There are no accounts: every device reads and writes the same rows using the publishable key.
-- That means anyone who has the site's URL can see and edit the ratings.
--
-- Each row is one rating / watchlist item, stored as JSON so the app's types can grow
-- without migrations.

create table if not exists public.movie_entries (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.movie_watchlist (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- The old per-user policies reference user_id, so they must go before the column does.
drop policy if exists "movie: own entries" on public.movie_entries;
drop policy if exists "movie: own watchlist" on public.movie_watchlist;

-- Upgrade from the earlier signed-in version (rows keyed by user_id + key): keep the newest
-- row per key, drop the user column and its policy, and key rows by `key` alone.
do $$
declare t text;
begin
  foreach t in array array['movie_entries', 'movie_watchlist'] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'user_id'
    ) then
      execute format(
        'delete from public.%1$I a using public.%1$I b
          where a.key = b.key and (a.updated_at, a.user_id::text) < (b.updated_at, b.user_id::text)', t);
      execute format('alter table public.%I drop column user_id', t);
      execute format('alter table public.%I add primary key (key)', t);
    end if;
  end loop;
end $$;

create or replace function public.movie_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists movie_entries_touch on public.movie_entries;
create trigger movie_entries_touch before update on public.movie_entries
  for each row execute function public.movie_touch_updated_at();

drop trigger if exists movie_watchlist_touch on public.movie_watchlist;
create trigger movie_watchlist_touch before update on public.movie_watchlist
  for each row execute function public.movie_touch_updated_at();

-- RLS stays on (Supabase expects it), with policies that let the site read and write these
-- two tables without signing in. No other table in the project is affected.
alter table public.movie_entries enable row level security;
alter table public.movie_watchlist enable row level security;

drop policy if exists "movie: open" on public.movie_entries;
create policy "movie: open" on public.movie_entries
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "movie: open" on public.movie_watchlist;
create policy "movie: open" on public.movie_watchlist
  for all to anon, authenticated using (true) with check (true);

-- Live updates between devices (Mac ↔ iPhone).
do $$
begin
  alter publication supabase_realtime add table public.movie_entries, public.movie_watchlist;
exception when duplicate_object then null;
end $$;
