"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

export type Table = "entries" | "watchlist";
/**
 * Remote table names are prefixed so the app can share a Supabase project with other apps
 * (the free tier allows two projects). Local cache keys keep the short names.
 */
const REMOTE: Record<Table, string> = { entries: "movie_entries", watchlist: "movie_watchlist" };

export type SyncStatus = "local" | "syncing" | "synced" | "offline" | "error";

/** Queued remote writes, by key. `null` means delete. Survives reloads so offline edits aren't lost. */
type Pending<T> = Record<string, T | null>;

function readJSON<V>(key: string, fallback: V): V {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as V) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable; state still works for this session
  }
}

const keys = (table: Table) => ({
  cache: `reel:${table}`, // same key the app used before sync existed
  pending: `reel:pending:${table}`,
  merged: `reel:merged:${table}`,
});

const PAGE = 1000;

async function fetchAll<T>(table: Table): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase!.from(REMOTE[table]).select("key,data").order("key").range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data as { data: T }[]).map((r) => r.data));
    if (data.length < PAGE) return out;
  }
}

/** Send queued writes. Keys edited again while the request was in flight stay queued. */
async function flush<T>(table: Table) {
  const k = keys(table);
  const entries = Object.entries(readJSON<Pending<T>>(k.pending, {}));
  if (entries.length === 0) return;

  const upserts = entries.filter(([, v]) => v !== null).map(([key, data]) => ({ key, data }));
  const deletes = entries.filter(([, v]) => v === null).map(([key]) => key);
  if (upserts.length) {
    const { error } = await supabase!.from(REMOTE[table]).upsert(upserts, { onConflict: "key" });
    if (error) throw error;
  }
  if (deletes.length) {
    const { error } = await supabase!.from(REMOTE[table]).delete().in("key", deletes);
    if (error) throw error;
  }

  const now = readJSON<Pending<T>>(k.pending, {});
  for (const [key, v] of entries) {
    if (JSON.stringify(now[key]) === JSON.stringify(v)) delete now[key];
  }
  writeJSON(k.pending, now);
}

/**
 * A keyed list stored in localStorage and, when Supabase is configured, mirrored to a shared
 * table (`movie_entries` / `movie_watchlist`: `key, data jsonb`). There are no accounts: every
 * device reads and writes the same rows. Local state updates instantly; remote writes are
 * queued and retried.
 *
 * `merge` (a stable, module-level function) decides whether an item already saved on this
 * device replaces the shared copy the first time the device syncs.
 */
export function useSyncedList<T extends { key: string }>(table: Table, merge: (local: T, remote: T | undefined) => boolean) {
  const [items, setItems] = useState<T[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<SyncStatus>("local");
  const itemsRef = useRef<T[]>([]);
  const generation = useRef(0); // bumps on every local edit, so stale fetches are discarded

  const show = useCallback(
    (next: T[]) => {
      itemsRef.current = next;
      setItems(next);
      writeJSON(keys(table).cache, next);
    },
    [table],
  );

  const push = useCallback(async () => {
    if (!supabase) return;
    setStatus("syncing");
    try {
      await flush<T>(table);
      setStatus("synced");
    } catch {
      setStatus(navigator.onLine ? "error" : "offline");
    }
  }, [table]);

  const pull = useCallback(async () => {
    if (!supabase) return;
    const k = keys(table);
    const gen = generation.current;
    setStatus("syncing");
    try {
      await flush<T>(table);

      // First sync on this device: fold in whatever it already had saved locally.
      if (!localStorage.getItem(k.merged)) {
        const local = readJSON<T[]>(k.cache, []);
        if (Array.isArray(local) && local.length) {
          const remote = new Map((await fetchAll<T>(table)).map((i) => [i.key, i]));
          const pending = readJSON<Pending<T>>(k.pending, {});
          for (const item of local) if (merge(item, remote.get(item.key))) pending[item.key] = item;
          writeJSON(k.pending, pending);
          await flush<T>(table);
        }
        writeJSON(k.merged, true);
      }

      const remote = await fetchAll<T>(table);
      if (gen !== generation.current) return; // edited mid-fetch; the edit's own sync will refetch
      const map = new Map(remote.map((i) => [i.key, i]));
      for (const [key, v] of Object.entries(readJSON<Pending<T>>(k.pending, {}))) {
        if (v === null) map.delete(key);
        else map.set(key, v);
      }
      show([...map.values()]);
      setStatus("synced");
    } catch {
      setStatus(navigator.onLine ? "error" : "offline");
    }
  }, [table, show, merge]);

  // Show the local cache straight away, then sync.
  useEffect(() => {
    const cached = readJSON<T[]>(keys(table).cache, []);
    itemsRef.current = Array.isArray(cached) ? cached : [];
    setItems(itemsRef.current);
    setLoaded(true);
    setStatus(supabase ? "syncing" : "local");
    pull();
  }, [table, pull]);

  // Pick up changes from other devices: live via realtime, plus whenever the app regains focus
  // (iOS suspends background tabs, so realtime alone isn't enough on iPhone).
  useEffect(() => {
    if (!supabase) return;
    let timer: ReturnType<typeof setTimeout>;
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(pull, 400);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") soon();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", soon);
    window.addEventListener("focus", soon);
    const channel = supabase
      .channel(REMOTE[table])
      .on("postgres_changes", { event: "*", schema: "public", table: REMOTE[table] }, soon)
      .subscribe();
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", soon);
      window.removeEventListener("focus", soon);
      supabase!.removeChannel(channel);
    };
  }, [table, pull]);

  /** Replace the whole list; only keys that actually changed are sent to Supabase. */
  const commit = useCallback(
    (next: T[]) => {
      const prev = new Map(itemsRef.current.map((i) => [i.key, i]));
      show(next);
      if (!supabase) return;
      generation.current++;
      const k = keys(table);
      const pending = readJSON<Pending<T>>(k.pending, {});
      const nextKeys = new Set<string>();
      for (const item of next) {
        nextKeys.add(item.key);
        if (JSON.stringify(prev.get(item.key)) !== JSON.stringify(item)) pending[item.key] = item;
      }
      for (const key of prev.keys()) if (!nextKeys.has(key)) pending[key] = null;
      writeJSON(k.pending, pending);
      push();
    },
    [show, push, table],
  );

  const current = useCallback(() => itemsRef.current, []);

  return { items, loaded, status, commit, current, refresh: pull };
}
