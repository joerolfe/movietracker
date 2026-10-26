export type MediaType = "movie" | "tv";

export interface SearchResult {
  id: number;
  type: MediaType;
  title: string;
  year: string;
  poster: string | null;
  overview: string;
}

export interface Entry {
  key: string; // `${type}-${id}`
  id: number;
  type: MediaType;
  title: string;
  year: string;
  poster: string | null;
  rating: number; // 0-5, one decimal
  review: string;
  groups?: string[]; // user-defined collections, e.g. "Marvel"
  minutes?: number; // total duration: film runtime, or all aired episodes for a series
  episodes?: number; // series only
  seasons?: number; // series only
  watched: string; // YYYY-MM-DD
  updatedAt: number;
}

export interface WatchItem {
  key: string; // `${type}-${id}`
  id: number;
  type: MediaType;
  title: string;
  year: string;
  poster: string | null;
  minutes?: number;
  episodes?: number;
  seasons?: number;
  addedAt: number;
}

export const entryKey = (type: MediaType, id: number) => `${type}-${id}`;

/** Clamp to 0-5 and snap to one decimal place. */
export function snapRating(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const clamped = Math.min(5, Math.max(0, value));
  return Math.round(clamped * 10) / 10;
}

export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Trim, drop empties and case-insensitive duplicates, keeping first-seen casing. */
export function normalizeGroups(groups: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const g of groups) {
    const name = g.trim().replace(/\s+/g, " ");
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      out.push(name);
    }
  }
  return out;
}

export interface TitleFacts {
  minutes?: number;
  episodes?: number;
  seasons?: number;
}

/** 148 -> "2h 28m", 45 -> "45m". */
export function formatDuration(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "3 seasons · 30 episodes · 25h 10m" / "2h 28m" — empty string when nothing is known. */
export function describeFacts(f: TitleFacts, compact = false): string {
  const parts: string[] = [];
  if (compact) {
    if (f.episodes) parts.push(`${f.episodes} ep${f.episodes === 1 ? "" : "s"}`);
    if (f.minutes) parts.push(formatDuration(f.minutes));
    return parts.join(" · ");
  }
  if (f.seasons) parts.push(`${f.seasons} season${f.seasons === 1 ? "" : "s"}`);
  if (f.episodes) parts.push(`${f.episodes} episode${f.episodes === 1 ? "" : "s"}`);
  if (f.minutes) parts.push(formatDuration(f.minutes));
  return parts.join(" · ");
}
