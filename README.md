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

Without Supabase everything is stored in the browser. With it, every device that opens the site shares the same ratings and watchlist. There's no sign-in, so anyone who has the site's URL can see and edit them.

1. Use any Supabase project, including one you already use for another app. A free account allows two projects, and the tables are prefixed `movie_` so they won't clash. Otherwise create one at https://supabase.com.
2. In **SQL Editor**, paste and run [`supabase/schema.sql`](supabase/schema.sql). It creates the `movie_entries` and `movie_watchlist` tables, lets the site read and write them without signing in, and turns on realtime. It also upgrades tables made by the earlier signed-in version, keeping their rows.
3. In **Project Settings → API Keys**, copy the project URL and the publishable key into `.env.local` (and Vercel, as **Config** variables) as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Never use the secret key here.
4. Restart `npm run dev`. The top-right button shows **Sync** with a green dot once it's connected. Ratings already saved in a browser are added the first time it syncs.

To use it on an iPhone the app must be reachable from the phone. The easiest way is to deploy to Vercel and set the same three environment variables there. Then in Safari, tap Share → **Add to Home Screen** to open it full-screen like an app.

Edits apply instantly and are queued in `localStorage`, so the app keeps working offline and catches up when it reconnects. Other devices pick up changes live, and again whenever the app comes back to the foreground.

## Structure

- `app/page.tsx` – Films / TV series tabs, search, rated grid, sorting, stats, import/export
- `app/api/search/route.ts` – `GET /api/search?type=movie|tv&q=...` TMDB proxy (18 results max)
- `components/RateModal.tsx` – slider, number input, presets, ±0.1, watched date, review
- `components/Stars.tsx` – five stars with fractional fill
- `lib/types.ts` – `Entry` / `SearchResult` types and rating helpers
- `components/Sheet.tsx` – bottom sheet on phones / dialog on desktop, with a pinned footer
- `components/SyncSheet.tsx` – sync status, sync now, import/export
- `lib/useSyncedList.ts` – localStorage cache + Supabase mirror with an offline write queue
- `lib/useEntries.ts`, `lib/useWatchlist.ts` – ratings and watchlist built on `useSyncedList`
- `supabase/schema.sql` – tables, open access policies and realtime

## Storage

Ratings are cached in `localStorage` (`reel:entries`, `reel:watchlist`) along with a queue of unsent writes. With Supabase configured, the shared tables are the source of truth. Export / Import (merge by key, newest `updatedAt` wins) still works as a backup.
