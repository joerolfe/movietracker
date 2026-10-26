"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import RateModal from "@/components/RateModal";
import Stars from "@/components/Stars";
import { useEntries } from "@/lib/useEntries";
import { entryKey, normalizeGroups, type Entry, type MediaType, type SearchResult } from "@/lib/types";

type Sort = "recent" | "highest" | "lowest" | "az";

const TABS: { type: MediaType; label: string }[] = [
  { type: "movie", label: "Films" },
  { type: "tv", label: "TV series" },
];

function toResult(e: Entry): SearchResult {
  return { id: e.id, type: e.type, title: e.title, year: e.year, poster: e.poster, overview: "" };
}

function Badge({ rating }: { rating: number }) {
  return (
    <span className="absolute right-1.5 top-1.5 rounded bg-black/75 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-star">
      ★ {rating.toFixed(1)}
    </span>
  );
}

function Poster({ src, title }: { src: string | null; title: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={title} loading="lazy" className="h-full w-full object-cover" />
  ) : (
    <div className="flex h-full w-full items-center justify-center p-2 text-center text-xs text-muted">{title}</div>
  );
}

function Tile({
  item,
  rating,
  onClick,
}: {
  item: SearchResult | Entry;
  rating?: number;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="group text-left">
      <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-line bg-panel transition group-hover:border-accent">
        <Poster src={item.poster} title={item.title} />
        {rating !== undefined && <Badge rating={rating} />}
      </div>
      <p className="mt-1.5 truncate text-sm font-medium">{item.title}</p>
      <p className="text-xs text-muted">{item.year || "—"}</p>
    </button>
  );
}

const GRID = "grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6";

function TabPanel({
  type,
  entries: allEntries,
  active,
  onOpen,
}: {
  type: MediaType;
  entries: Entry[];
  active: boolean;
  onOpen: (item: SearchResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [group, setGroup] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = type === "movie" ? "films" : "TV series";

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when the query is cleared
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?type=${type}&q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Search failed");
        setResults(data.results);
        setError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setResults([]);
        setError((err as Error).message);
      }
      setLoading(false);
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, type]);

  const byKey = useMemo(() => new Map(allEntries.map((e) => [e.key, e])), [allEntries]);

  const groups = useMemo(() => normalizeGroups(allEntries.flatMap((e) => e.groups ?? [])).sort((a, b) => a.localeCompare(b)), [allEntries]);
  // If the active group disappears (last entry removed/edited), fall back to All.
  const activeGroup = group && groups.some((g) => g.toLowerCase() === group.toLowerCase()) ? group : null;
  const entries = useMemo(
    () =>
      activeGroup
        ? allEntries.filter((e) => e.groups?.some((g) => g.toLowerCase() === activeGroup.toLowerCase()))
        : allEntries,
    [allEntries, activeGroup],
  );

  const sorted = useMemo(() => {
    const list = [...entries];
    switch (sort) {
      case "highest":
        return list.sort((a, b) => b.rating - a.rating || a.title.localeCompare(b.title));
      case "lowest":
        return list.sort((a, b) => a.rating - b.rating || a.title.localeCompare(b.title));
      case "az":
        return list.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return list.sort((a, b) => b.watched.localeCompare(a.watched) || b.updatedAt - a.updatedAt);
    }
  }, [entries, sort]);

  const average = entries.length ? entries.reduce((s, e) => s + e.rating, 0) / entries.length : 0;
  const full = Math.round(average);
  const starText = "★".repeat(full) + "☆".repeat(5 - full);

  return (
    <section hidden={!active} className="space-y-8">
      <div className="space-y-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${label} to rate…`}
          aria-label={`Search ${label}`}
          className="w-full rounded-lg border border-line bg-panel px-4 py-3 outline-none placeholder:text-muted focus:border-accent"
        />
        {error && (
          <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}
        {loading && <p className="text-sm text-muted">Searching…</p>}
        {!loading && !error && query.trim() && results.length === 0 && (
          <p className="text-sm text-muted">No results.</p>
        )}
        {results.length > 0 && (
          <div className={GRID}>
            {results.map((r) => {
              const existing = byKey.get(entryKey(r.type, r.id));
              return <Tile key={r.id} item={r} rating={existing?.rating} onClick={() => onOpen(r)} />;
            })}
          </div>
        )}
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <p className="text-sm text-muted">
            <span className="font-semibold text-[#e6edf3]">{entries.length}</span> rated
            {entries.length > 0 && (
              <>
                {" "}
                · average <span className="text-star">{starText}</span>{" "}
                <span className="font-semibold tabular-nums text-[#e6edf3]">{average.toFixed(2)}</span>
              </>
            )}
          </p>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label="Sort"
            className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm outline-none focus:border-accent"
          >
            <option value="recent">Recently watched</option>
            <option value="highest">Highest rated</option>
            <option value="lowest">Lowest rated</option>
            <option value="az">A–Z</option>
          </select>
        </div>

        {groups.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2" aria-label="Filter by group">
            {[null, ...groups].map((g) => (
              <button
                key={g ?? "__all"}
                type="button"
                onClick={() => setGroup(g)}
                aria-pressed={activeGroup === g}
                className={`rounded-full border px-3 py-1 text-sm ${
                  activeGroup === g
                    ? "border-accent bg-accent text-black"
                    : "border-line bg-panel text-muted hover:border-accent hover:text-accent"
                }`}
              >
                {g ?? "All"}
              </button>
            ))}
          </div>
        )}

        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line px-6 py-16 text-center">
            <Stars rating={0} size={28} />
            <p className="mt-4 font-medium">Nothing rated yet</p>
            <p className="mt-1 text-sm text-muted">Search for a title above to give your first rating.</p>
          </div>
        ) : (
          <div className={GRID}>
            {sorted.map((e) => (
              <Tile key={e.key} item={e} rating={e.rating} onClick={() => onOpen(toResult(e))} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function Home() {
  const { entries, loaded, save, remove, replaceAll } = useEntries();
  const [tab, setTab] = useState<MediaType>("movie");
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const existing = selected ? entries.find((e) => e.key === entryKey(selected.type, selected.id)) : undefined;
  const close = () => setSelected(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reel-ratings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data)) throw new Error("not an array");
      const valid = data.filter(
        (e): e is Entry =>
          e &&
          typeof e.id === "number" &&
          (e.type === "movie" || e.type === "tv") &&
          typeof e.title === "string" &&
          typeof e.rating === "number",
      );
      const merged = new Map(entries.map((e) => [e.key, e]));
      for (const raw of valid) {
        const e: Entry = {
          ...raw,
          key: entryKey(raw.type, raw.id),
          rating: Math.min(5, Math.max(0, Math.round(raw.rating * 10) / 10)),
          review: raw.review ?? "",
          groups: Array.isArray(raw.groups) ? normalizeGroups(raw.groups.filter((g) => typeof g === "string")) : [],
          year: raw.year ?? "",
          poster: raw.poster ?? null,
          watched: raw.watched ?? "",
          updatedAt: raw.updatedAt ?? Date.now(),
        };
        const current = merged.get(e.key);
        if (!current || e.updatedAt >= current.updatedAt) merged.set(e.key, e);
      }
      replaceAll([...merged.values()]);
      setNotice(`Imported ${valid.length} rating${valid.length === 1 ? "" : "s"}.`);
    } catch {
      setNotice("Import failed: that file isn't a valid Movie Tracker export.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16">
      <header className="flex items-center justify-between gap-3 py-5">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-accent">●</span> Movie Tracker
        </h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-accent hover:text-accent"
          >
            Import
          </button>
          <button
            type="button"
            onClick={exportJson}
            disabled={entries.length === 0}
            className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-accent hover:text-accent disabled:opacity-40 disabled:hover:border-line disabled:hover:text-inherit"
          >
            Export
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJson(f);
              e.target.value = "";
            }}
          />
        </div>
      </header>

      {notice && (
        <p
          role="status"
          onClick={() => setNotice(null)}
          className="mb-4 cursor-pointer rounded-lg border border-line bg-panel px-4 py-2 text-sm"
        >
          {notice}
        </p>
      )}

      <nav className="mb-6 flex gap-1 border-b border-line" role="tablist">
        {TABS.map((t) => {
          const count = entries.filter((e) => e.type === t.type).length;
          return (
            <button
              key={t.type}
              role="tab"
              aria-selected={tab === t.type}
              onClick={() => setTab(t.type)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${
                tab === t.type ? "border-accent text-accent" : "border-transparent text-muted hover:text-[#e6edf3]"
              }`}
            >
              {t.label} <span className="ml-1 text-xs opacity-70">{loaded ? count : ""}</span>
            </button>
          );
        })}
      </nav>

      {TABS.map((t) => (
        <TabPanel
          key={t.type}
          type={t.type}
          active={tab === t.type}
          entries={entries.filter((e) => e.type === t.type)}
          onOpen={setSelected}
        />
      ))}

      {selected && (
        <RateModal
          key={entryKey(selected.type, selected.id)}
          item={selected}
          existing={existing}
          allGroups={normalizeGroups(entries.flatMap((e) => e.groups ?? []))}
          onSave={(e) => {
            save(e);
            close();
          }}
          onRemove={(k) => {
            remove(k);
            close();
          }}
          onClose={close}
        />
      )}
    </div>
  );
}
