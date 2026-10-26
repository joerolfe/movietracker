import { NextResponse } from "next/server";
import { detectGroups } from "@/lib/franchises";

const TMDB = "https://api.themoviedb.org/3";

interface Details {
  production_companies?: { name: string }[];
  belongs_to_collection?: { name: string } | null;
  keywords?: { keywords?: { name: string }[]; results?: { name: string }[] };
}

/** GET /api/details?type=movie|tv&id=123 -> { groups: ["Marvel"] } (franchise suggestions). */
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
  const url = new URL(`${TMDB}/${type}/${id}`);
  url.searchParams.set("append_to_response", "keywords");
  if (!isV4) url.searchParams.set("api_key", key);

  try {
    const res = await fetch(url, {
      headers: isV4 ? { Authorization: `Bearer ${key}`, accept: "application/json" } : { accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return NextResponse.json({ error: `TMDB returned an error (${res.status}).` }, { status: 502 });
    const d = (await res.json()) as Details;
    const groups = detectGroups({
      companies: (d.production_companies ?? []).map((c) => c.name),
      collection: d.belongs_to_collection?.name ?? null,
      keywords: (d.keywords?.keywords ?? d.keywords?.results ?? []).map((k) => k.name),
    });
    return NextResponse.json({ groups });
  } catch {
    return NextResponse.json({ error: "Could not reach TMDB." }, { status: 502 });
  }
}
