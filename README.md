# Movie Tracker

Movie Tracker is a Letterboxd-style site for rating films and TV series out of 5, to one decimal place. Built with Next.js (App Router), TypeScript and Tailwind.

## Setup

```bash
npm install
cp .env.example .env.local   # then add your TMDB key (and Supabase keys, below)
npm run dev
```

Open http://localhost:3000.

`TMDB_API_KEY` accepts either a TMDB v3 API key (sent as `api_key`) or a v4 read access token (any key longer than 40 characters, sent as a Bearer header). Get one at https://www.themoviedb.org/settings/api. The key is only used by the server routes, never sent to the browser.

## Sync between devices (Supabase)

Without Supabase everything is stored in the browser. With it, signing in with the same account on your Mac and iPhone shows the same ratings and watchlist.

1. Use any Supabase project, including one you already use for another app. A free account allows two projects, and the tables are prefixed `movie_` so they won't clash. Otherwise create one at https://supabase.com.
2. In **SQL Editor**, paste and run [`supabase/schema.sql`](supabase/schema.sql). It creates the `movie_entries` and `movie_watchlist` tables, row-level security so each account only sees its own rows, and turns on realtime.
3. In **Project Settings → API Keys**, copy the project URL and the publishable (anon) key into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Both are safe to expose to the browser; RLS protects the data.
4. Sign-in accounts belong to the project, so a shared project shares its user list with your other app. Each account still only sees its own ratings. In **Authentication → URL Configuration**, set the Site URL to wherever the app is hosted, so sign-up confirmation emails link back to it. Or switch off **Confirm email** under Authentication → Sign In / Providers → Email to sign in straight away.
5. Restart `npm run dev`, tap **Sign in** (top right), and create an account. Ratings already saved in that browser are uploaded the first time you sign in there.

To use it on an iPhone the app must be reachable from the phone. The easiest way is to deploy to Vercel and set the same three environment variables there. Then in Safari, tap Share → **Add to Home Screen** to open it full-screen like an app.

Edits apply instantly and are queued in `localStorage`, so the app keeps working offline and catches up when it reconnects. Other devices pick up changes live, and again whenever the app comes back to the foreground.

## Structure

- `app/page.tsx` – Films / TV series tabs, search, rated grid, sorting, stats, import/export
- `app/api/search/route.ts` – `GET /api/search?type=movie|tv&q=...` TMDB proxy (18 results max)
- `components/RateModal.tsx` – slider, number input, presets, ±0.1, watched date, review
- `components/Stars.tsx` – five stars with fractional fill
- `lib/types.ts` – `Entry` / `SearchResult` types and rating helpers
- `components/Sheet.tsx` – bottom sheet on phones / dialog on desktop, with a pinned footer
- `components/AccountSheet.tsx` – sign in, sync status, import/export
- `lib/useSyncedList.ts` – localStorage cache + Supabase mirror with an offline write queue
- `lib/useEntries.ts`, `lib/useWatchlist.ts` – ratings and watchlist built on `useSyncedList`
- `supabase/schema.sql` – tables, RLS policies and realtime

## Storage

Signed out, ratings live in `localStorage` (`reel:entries`, `reel:watchlist`). Signed in, Supabase is the source of truth and `localStorage` holds a per-account cache plus a queue of unsent writes. Export / Import (merge by key, newest `updatedAt` wins) still works as a backup.
