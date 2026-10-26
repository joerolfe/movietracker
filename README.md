# Reel

A Letterboxd-style site for rating films and TV series out of 5, to one decimal place. Built with Next.js (App Router), TypeScript and Tailwind.

## Setup

```bash
npm install
cp .env.example .env.local   # then add your TMDB key
npm run dev
```

Open http://localhost:3000.

`TMDB_API_KEY` accepts either a TMDB v3 API key (sent as `api_key`) or a v4 read access token (any key longer than 40 characters, sent as a Bearer header). Get one at https://www.themoviedb.org/settings/api. The key is only used by the server route `/api/search`, never sent to the browser.

## Structure

- `app/page.tsx` – Films / TV series tabs, search, rated grid, sorting, stats, import/export
- `app/api/search/route.ts` – `GET /api/search?type=movie|tv&q=...` TMDB proxy (18 results max)
- `components/RateModal.tsx` – slider, number input, presets, ±0.1, watched date, review
- `components/Stars.tsx` – five stars with fractional fill
- `lib/types.ts` – `Entry` / `SearchResult` types and rating helpers
- `lib/useEntries.ts` – storage hook (`entries`, `save`, `remove`, `replaceAll`)

## Storage

Ratings live in `localStorage` (key `reel:entries`) behind `useEntries`. Nothing else touches storage, so swapping in Supabase later only means changing that hook. Use Export / Import (merge by key, newest `updatedAt` wins) to back up or move ratings between browsers.
