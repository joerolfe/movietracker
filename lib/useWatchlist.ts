"use client";

import { useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import type { TitleFacts, WatchItem } from "./types";
import { useSyncedList } from "./useSyncedList";

const missing = (_local: WatchItem, remote: WatchItem | undefined) => !remote;

/** Watchlist, stored locally and synced to Supabase when signed in. */
export function useWatchlist(user: User | null) {
  const { items, status, commit, current } = useSyncedList<WatchItem>("watchlist", user, missing);

  const add = useCallback(
    (item: WatchItem) => {
      if (!current().some((i) => i.key === item.key)) commit([...current(), item]);
    },
    [commit, current],
  );

  const remove = useCallback(
    (key: string) => {
      if (current().some((i) => i.key === key)) commit(current().filter((i) => i.key !== key));
    },
    [commit, current],
  );

  const update = useCallback(
    (key: string, patch: TitleFacts) => commit(current().map((i) => (i.key === key ? { ...i, ...patch } : i))),
    [commit, current],
  );

  return { items, status, add, remove, update, replaceAll: commit };
}
