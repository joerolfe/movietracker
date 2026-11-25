-- Movie Tracker schema. Paste into Supabase → SQL Editor → New query, then Run.
-- Safe to run in a project you already use for something else: everything is prefixed movie_
-- and nothing existing is touched.
-- Each row is one rating / watchlist item, stored as JSON so the app's types can grow
-- without migrations. Row Level Security limits every user to their own rows.

create table if not exists public.movie_entries (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create table if not exists public.movie_watchlist (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

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

alter table public.movie_entries enable row level security;
alter table public.movie_watchlist enable row level security;

drop policy if exists "movie: own entries" on public.movie_entries;
create policy "movie: own entries" on public.movie_entries
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "movie: own watchlist" on public.movie_watchlist;
create policy "movie: own watchlist" on public.movie_watchlist
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Live updates between devices (Mac ↔ iPhone).
do $$
begin
  alter publication supabase_realtime add table public.movie_entries, public.movie_watchlist;
exception when duplicate_object then null;
end $$;
