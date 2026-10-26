import { NextResponse } from "next/server";
import { detectGroups } from "@/lib/franchises";

const TMDB = "https://api.themoviedb.org/3";
const MAX_SEASONS = 20; // TMDB allows at most 20 appended requests per call

interface Episode {
  runtime?: number | null;
  air_date?: string | null;
}

interface Details {
  runtime?: number | null;
  episode_run_time?: number[];
  number_of_episodes?: number;
  number_of_seasons?: number;
  seasons?: { season_number: number }[];
  last_episode_to_air?: { runtime?: number | null } | null;
  production_companies?: { name: string }[];
  belongs_to_collection?: { name: string } | null;
  keywords?: { keywords?: { name: string }[]; results?: { name: string }[] };
}

type Auth = { headers: Record<string, string>; params: Record<string, string> };

async function tmdb<T>(path: string, auth: Auth, extra: Record<string, string>): Promise<T | null> {
  const url = new URL(`${TMDB}${path}`);
  for (const [k, v] of Object.entries({ ...auth.params, ...extra })) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: auth.headers, next: { revalidate: 86400 } });
  return res.ok ? ((await res.json()) as T) : null;
}

/** Exact total from every season's episode runtimes, counting only episodes that have aired. */
async function seriesTotals(id: number, d: Details, auth: Auth) {
  const fallback =
    d.episode_run_time?.find((m) => m > 0) ?? d.last_episode_to_air?.runtime ?? undefined;
  const seasonNumbers = (d.seasons ?? []).map((s) => s.season_number).filter((n) => n > 0);
  const base = { seasons: d.number_of_seasons, episodes: d.number_of_episodes };
  const estimate = () => ({
    ...base,
    minutes: base.episodes && fallback ? base.episodes * fallback : undefined,
  });
  if (seasonNumbers.length === 0 || seasonNumbers.length > MAX_SEASONS) return estimate();

  const data = await tmdb<Record<string, { episodes?: Episode[] }>>(`/tv/${id}`, auth, {
    append_to_response: seasonNumbers.map((n) => `season/${n}`).join(","),
  });
  if (!data) return estimate();

  const today = new Date().toISOString().slice(0, 10);
  const aired = seasonNumbers
    .flatMap((n) => data[`season/${n}`]?.episodes ?? [])
    .filter((e) => !e.air_date || e.air_date <= today);
  if (aired.length === 0) return estimate();

  const known = aired.map((e) => e.runtime).filter((m): m is number => !!m && m > 0);
  const avg = known.length ? known.reduce((a, b) => a + b, 0) / known.length : fallback;
  const minutes = known.reduce((a, b) => a + b, 0) + (aired.length - known.length) * (avg ?? 0);
  return { seasons: d.number_of_seasons, episodes: aired.length, minutes: minutes > 0 ? Math.round(minutes) : undefined };
}

/** GET /api/details?type=movie|tv&id=123 -> { groups, minutes, episodes?, seasons? } */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const id = Number(searchParams.get("id"));

  if ((type !== "movie" && type !== "tv") || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "type must be 'movie' or 'tv' and id a positive integer" }, { status: 400 });
  }

  const key = process.env.TMDB_API_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: "TMDB_API_KEY is not set." }, { status: 500 });
  }

  const isV4 = key.length > 40;
  const auth: Auth = {
    headers: isV4 ? { Authorization: `Bearer ${key}`, accept: "application/json" } : { accept: "application/json" },
    params: isV4 ? {} : { api_key: key },
  };

  try {
    const d = await tmdb<Details>(`/${type}/${id}`, auth, { append_to_response: "keywords" });
    if (!d) return NextResponse.json({ error: "TMDB returned an error." }, { status: 502 });

    const groups = detectGroups({
      companies: (d.production_companies ?? []).map((c) => c.name),
      collection: d.belongs_to_collection?.name ?? null,
      keywords: (d.keywords?.keywords ?? d.keywords?.results ?? []).map((k) => k.name),
    });
    const facts = type === "movie" ? { minutes: d.runtime || undefined } : await seriesTotals(id, d, auth);
    return NextResponse.json({ groups, ...facts });
  } catch {
    return NextResponse.json({ error: "Could not reach TMDB." }, { status: 502 });
  }
}
