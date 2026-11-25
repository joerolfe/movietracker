"use client";

import { useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import type { Entry } from "./types";
import { useSyncedList } from "./useSyncedList";

// When a signed-out device first signs in, its local rating wins only if it's newer.
const newer = (local: Entry, remote: Entry | undefined) => !remote || local.updatedAt > remote.updatedAt;

/** Ratings, stored locally and synced to Supabase when signed in. */
export function useEntries(user: User | null) {
  const { items: entries, loaded, status, commit, current, refresh } = useSyncedList<Entry>("entries", user, newer);

  const save = useCallback(
    (entry: Entry) => commit([...current().filter((e) => e.key !== entry.key), entry]),
    [commit, current],
  );

  const remove = useCallback((key: string) => commit(current().filter((e) => e.key !== key)), [commit, current]);

  return { entries, loaded, status, save, remove, replaceAll: commit, refresh };
}
