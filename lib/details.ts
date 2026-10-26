import type { MediaType, TitleFacts } from "./types";

export interface Details extends TitleFacts {
  groups: string[];
}

/** Client helper for /api/details: franchise suggestions plus episode count and total duration. */
export async function fetchDetails(type: MediaType, id: number, signal?: AbortSignal): Promise<Details> {
  const res = await fetch(`/api/details?type=${type}&id=${id}`, { signal });
  if (!res.ok) return { groups: [] };
  const data = (await res.json()) as Partial<Details>;
  return { ...data, groups: data.groups ?? [] };
}

const factsCache = new Map<string, Promise<TitleFacts>>();

/** Episodes / duration for a title, fetched once per page load and shared by every tile. */
export function getFacts(type: MediaType, id: number): Promise<TitleFacts> {
  const key = `${type}-${id}`;
  let hit = factsCache.get(key);
  if (!hit) {
    hit = fetchDetails(type, id)
      .then(({ minutes, episodes, seasons }) => ({ minutes, episodes, seasons }))
      .catch(() => {
        factsCache.delete(key); // allow a retry later
        return {};
      });
    factsCache.set(key, hit);
  }
  return hit;
}
