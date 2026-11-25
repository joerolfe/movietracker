"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
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

function removeKey(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

const keys = (table: Table, uid: string | null) => ({
  // Signed out uses the original key, so data saved before sync existed is still there.
  cache: uid ? `reel:${table}:${uid}` : `reel:${table}`,
  pending: `reel:pending:${table}:${uid}`,
  migrated: `reel:migrated:${table}:${uid}`,
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
async function flush<T>(table: Table, uid: string) {
  const k = keys(table, uid);
  const snapshot = readJSON<Pending<T>>(k.pending, {});
  const entries = Object.entries(snapshot);
  if (entries.length === 0) return;

  const upserts = entries.filter(([, v]) => v !== null).map(([key, data]) => ({ user_id: uid, key, data }));
  const deletes = entries.filter(([, v]) => v === null).map(([key]) => key);
  if (upserts.length) {
    const { error } = await supabase!.from(REMOTE[table]).upsert(upserts, { onConflict: "user_id,key" });
    if (error) throw error;
  }
  if (deletes.length) {
    const { error } = await supabase!.from(REMOTE[table]).delete().eq("user_id", uid).in("key", deletes);
    if (error) throw error;
  }

  const now = readJSON<Pending<T>>(k.pending, {});
  for (const [key, v] of entries) {
    if (JSON.stringify(now[key]) === JSON.stringify(v)) delete now[key];
  }
  writeJSON(k.pending, now);
}

/**
 * A keyed list stored in localStorage and, when signed in, mirrored to a Supabase table
 * (`movie_entries` / `movie_watchlist`: `user_id, key, data jsonb`). Local state updates instantly; remote writes are queued and retried.
 *
 * `merge` (a stable, module-level function) decides whether a signed-out device's local item
 * replaces the account's copy the first time someone signs in on that device.
 */
export function useSyncedList<T extends { key: string }>(
  table: Table,
  user: User | null,
  merge: (local: T, remote: T | undefined) => boolean,
) {
  const uid = user?.id ?? null;
  const [items, setItems] = useState<T[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<SyncStatus>("local");
  const itemsRef = useRef<T[]>([]);
  const generation = useRef(0); // bumps on every local edit, so stale fetches are discarded

  const show = useCallback(
    (next: T[]) => {
      itemsRef.current = next;
      setItems(next);
      writeJSON(keys(table, uid).cache, next);
    },
    [table, uid],
  );

  const push = useCallback(async () => {
    if (!supabase || !uid) return;
    setStatus("syncing");
    try {
      await flush<T>(table, uid);
      setStatus("synced");
    } catch {
      setStatus(navigator.onLine ? "error" : "offline");
    }
  }, [table, uid]);

  const pull = useCallback(async () => {
    if (!supabase || !uid) return;
    const k = keys(table, uid);
    const gen = generation.current;
    setStatus("syncing");
    try {
      await flush<T>(table, uid);

      // First sign-in on this device: fold in whatever was saved locally while signed out.
      if (!localStorage.getItem(k.migrated)) {
        const local = readJSON<T[]>(keys(table, null).cache, []);
        if (local.length) {
          const remote = new Map((await fetchAll<T>(table)).map((i) => [i.key, i]));
          const pending = readJSON<Pending<T>>(k.pending, {});
          for (const item of local) if (merge(item, remote.get(item.key))) pending[item.key] = item;
          writeJSON(k.pending, pending);
          await flush<T>(table, uid);
          removeKey(keys(table, null).cache);
        }
        writeJSON(k.migrated, true);
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
  }, [table, uid, show, merge]);

  // Load the cache for whoever is signed in, then sync.
  useEffect(() => {
    const cached = readJSON<T[]>(keys(table, uid).cache, []);
    itemsRef.current = Array.isArray(cached) ? cached : [];
    setItems(itemsRef.current);
    setLoaded(true);
    setStatus(uid && supabase ? "syncing" : "local");
    pull();
  }, [table, uid, pull]);

  // Pick up changes from other devices: live via realtime, plus whenever the app regains focus
  // (iOS suspends background tabs, so realtime alone isn't enough on iPhone).
  useEffect(() => {
    if (!supabase || !uid) return;
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
      .channel(`${REMOTE[table]}:${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: REMOTE[table], filter: `user_id=eq.${uid}` }, soon)
      .subscribe();
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", soon);
      window.removeEventListener("focus", soon);
      supabase!.removeChannel(channel);
    };
  }, [table, uid, pull]);

  /** Replace the whole list; only keys that actually changed are sent to Supabase. */
  const commit = useCallback(
    (next: T[]) => {
      const prev = new Map(itemsRef.current.map((i) => [i.key, i]));
      show(next);
      if (!supabase || !uid) return;
      generation.current++;
      const k = keys(table, uid);
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
    [show, push, table, uid],
  );

  const current = useCallback(() => itemsRef.current, []);

  return { items, loaded, status, commit, current, refresh: pull };
}
