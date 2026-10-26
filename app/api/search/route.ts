import { NextResponse } from "next/server";

const TMDB = "https://api.themoviedb.org/3";
const POSTER_BASE = "https://image.tmdb.org/t/p/w342";
const LIMIT = 18;

interface TmdbItem {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  overview?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const q = (searchParams.get("q") ?? "").trim();

  if (type !== "movie" && type !== "tv") {
    return NextResponse.json({ error: "type must be 'movie' or 'tv'" }, { status: 400 });
  }
  if (!q) return NextResponse.json({ results: [] });

  const key = process.env.TMDB_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "TMDB_API_KEY is not set. Copy .env.example to .env.local, add your key and restart the dev server." },
      { status: 500 },
    );
  }

  // v4 read tokens are long JWTs (use Bearer); v3 keys are 32 chars (use api_key param).
  const isV4 = key.length > 40;
  const url = new URL(`${TMDB}/search/${type}`);
  url.searchParams.set("query", q);
  url.searchParams.set("include_adult", "false");
  if (!isV4) url.searchParams.set("api_key", key);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: isV4 ? { Authorization: `Bearer ${key}`, accept: "application/json" } : { accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Could not reach TMDB." }, { status: 502 });
  }

  if (!res.ok) {
    const message =
      res.status === 401 ? "TMDB rejected the API key. Check TMDB_API_KEY." : `TMDB returned an error (${res.status}).`;
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const data = (await res.json()) as { results?: TmdbItem[] };
  const results = (data.results ?? []).slice(0, LIMIT).map((r) => ({
    id: r.id,
    type,
    title: (type === "movie" ? r.title : r.name) ?? "Untitled",
    year: ((type === "movie" ? r.release_date : r.first_air_date) ?? "").slice(0, 4),
    poster: r.poster_path ? `${POSTER_BASE}${r.poster_path}` : null,
    overview: r.overview ?? "",
  }));

  return NextResponse.json({ results });
}
