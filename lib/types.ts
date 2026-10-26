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
  watched: string; // YYYY-MM-DD
  updatedAt: number;
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
