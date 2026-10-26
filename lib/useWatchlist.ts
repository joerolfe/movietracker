"use client";

import { useCallback, useEffect, useState } from "react";
import type { TitleFacts, WatchItem } from "./types";

const STORAGE_KEY = "reel:watchlist";

function read(): WatchItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: WatchItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage full or unavailable; state still works for this session
  }
}

/** Same pattern as useEntries: storage stays behind the hook so it can be swapped for Supabase. */
export function useWatchlist() {
  const [items, setItems] = useState<WatchItem[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setItems(read());
  }, []);

  const replaceAll = useCallback((next: WatchItem[]) => {
    setItems(next);
    write(next);
  }, []);

  const add = useCallback((item: WatchItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.key === item.key)) return prev;
      const next = [...prev, item];
      write(next);
      return next;
    });
  }, []);

  const remove = useCallback((key: string) => {
    setItems((prev) => {
      if (!prev.some((i) => i.key === key)) return prev;
      const next = prev.filter((i) => i.key !== key);
      write(next);
      return next;
    });
  }, []);

  const update = useCallback((key: string, patch: TitleFacts) => {
    setItems((prev) => {
      const next = prev.map((i) => (i.key === key ? { ...i, ...patch } : i));
      write(next);
      return next;
    });
  }, []);

  return { items, add, remove, update, replaceAll };
}
