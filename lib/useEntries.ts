"use client";

import { useCallback, useEffect, useState } from "react";
import type { Entry } from "./types";

const STORAGE_KEY = "reel:entries";

function read(): Entry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries: Entry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // storage full or unavailable; state still works for this session
  }
}

/**
 * Storage lives entirely behind this hook. To move to Supabase later, keep
 * this return shape and swap the read/write calls for async ones.
 */
export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setEntries(read());
    setLoaded(true);
  }, []);

  const replaceAll = useCallback((next: Entry[]) => {
    setEntries(next);
    write(next);
  }, []);

  const save = useCallback((entry: Entry) => {
    setEntries((prev) => {
      const next = [...prev.filter((e) => e.key !== entry.key), entry];
      write(next);
      return next;
    });
  }, []);

  const remove = useCallback((key: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.key !== key);
      write(next);
      return next;
    });
  }, []);

  return { entries, loaded, save, remove, replaceAll };
}
