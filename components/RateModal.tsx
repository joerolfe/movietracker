"use client";

import { useEffect, useState } from "react";
import Stars from "./Stars";
import { entryKey, normalizeGroups, snapRating, todayISO, type Entry, type SearchResult } from "@/lib/types";

const PRESETS = [1, 2, 2.5, 3, 3.5, 4, 4.5, 5];

interface RateModalProps {
  item: SearchResult;
  existing?: Entry;
  allGroups: string[];
  onSave: (entry: Entry) => void;
  onRemove: (key: string) => void;
  onClose: () => void;
}

export default function RateModal({ item, existing, allGroups, onSave, onRemove, onClose }: RateModalProps) {
  const [rating, setRating] = useState(existing?.rating ?? 3);
  const [draft, setDraft] = useState((existing?.rating ?? 3).toFixed(1));
  const [watched, setWatched] = useState(existing?.watched ?? todayISO());
  const [review, setReview] = useState(existing?.review ?? "");
  const [groups, setGroups] = useState<string[]>(existing?.groups ?? []);
  const [groupDraft, setGroupDraft] = useState("");
  const [detected, setDetected] = useState<string[]>([]);
  const isNew = !existing;

  // Auto-detect franchises. New entries get them pre-ticked; existing ones only see them as suggestions.
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/details?type=${item.type}&id=${item.id}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { groups: [] }))
      .then((data: { groups?: string[] }) => {
        const found = data.groups ?? [];
        setDetected(found);
        if (isNew && found.length) setGroups((prev) => normalizeGroups([...prev, ...found]));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [item.type, item.id, isNew]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const set = (value: number) => {
    const v = snapRating(value);
    setRating(v);
    setDraft(v.toFixed(1));
  };

  const onNumberChange = (text: string) => {
    setDraft(text);
    const n = parseFloat(text);
    if (Number.isFinite(n)) setRating(snapRating(n));
  };

  const has = (g: string) => groups.some((x) => x.toLowerCase() === g.toLowerCase());
  const toggleGroup = (g: string) =>
    setGroups((prev) => (has(g) ? prev.filter((x) => x.toLowerCase() !== g.toLowerCase()) : normalizeGroups([...prev, g])));
  const addDraft = () => {
    if (groupDraft.trim()) toggleGroupOn(groupDraft);
    setGroupDraft("");
  };
  const toggleGroupOn = (g: string) => setGroups((prev) => normalizeGroups([...prev, g]));
  const groupOptions = normalizeGroups([...allGroups, ...detected, ...groups]);

  const submit = () => {
    onSave({
      key: entryKey(item.type, item.id),
      id: item.id,
      type: item.type,
      title: item.title,
      year: item.year,
      poster: item.poster,
      rating,
      review: review.trim(),
      groups: normalizeGroups(groups),
      watched: watched || todayISO(),
      updatedAt: Date.now(),
    });
  };

  const stepBtn =
    "h-10 w-14 rounded-lg border border-line bg-bg text-sm font-medium hover:border-accent hover:text-accent";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Rate ${item.title}`}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-line bg-panel p-5 shadow-2xl sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex gap-4">
          {item.poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.poster} alt="" className="h-28 w-[75px] shrink-0 rounded object-cover" />
          ) : (
            <div className="h-28 w-[75px] shrink-0 rounded bg-bg" />
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight">{item.title}</h2>
            <p className="text-sm text-muted">
              {item.year || "—"} · {item.type === "movie" ? "Film" : "TV series"}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Stars rating={rating} size={22} />
              <span className="text-xl font-semibold tabular-nums text-star">{rating.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className="flex items-center gap-3">
            <button type="button" className={stepBtn} onClick={() => set(rating - 0.1)}>
              −0.1
            </button>
            <input
              type="range"
              min={0}
              max={5}
              step={0.1}
              value={rating}
              onChange={(e) => set(parseFloat(e.target.value))}
              aria-label="Rating slider"
              className="h-2 flex-1 cursor-pointer accent-accent"
            />
            <button type="button" className={stepBtn} onClick={() => set(rating + 0.1)}>
              +0.1
            </button>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="rating-input" className="text-sm text-muted">
              Rating
            </label>
            <input
              id="rating-input"
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={draft}
              onChange={(e) => onNumberChange(e.target.value)}
              onBlur={() => setDraft(rating.toFixed(1))}
              className="w-24 rounded-lg border border-line bg-bg px-3 py-2 tabular-nums outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => set(p)}
                className={`rounded-full border px-3 py-1 text-sm tabular-nums ${
                  rating === p
                    ? "border-accent bg-accent text-black"
                    : "border-line bg-bg text-muted hover:border-accent hover:text-accent"
                }`}
              >
                {p.toFixed(1)}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="watched" className="mb-1 block text-sm text-muted">
              Watched on
            </label>
            <input
              id="watched"
              type="date"
              value={watched}
              onChange={(e) => setWatched(e.target.value)}
              className="rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="group-input" className="mb-1 block text-sm text-muted">
              Groups <span className="text-muted/60">(e.g. Marvel, Star Wars)</span>
            </label>
            {detected.length > 0 && (
              <p className="mb-2 text-xs text-muted">Auto-detected: {detected.join(", ")}</p>
            )}
            {groupOptions.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {groupOptions.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGroup(g)}
                    aria-pressed={has(g)}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      has(g)
                        ? "border-accent bg-accent text-black"
                        : "border-line bg-bg text-muted hover:border-accent hover:text-accent"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                id="group-input"
                value={groupDraft}
                onChange={(e) => setGroupDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDraft();
                  }
                }}
                placeholder="New group…"
                className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={addDraft}
                className="rounded-lg border border-line px-3 py-2 text-sm hover:border-accent hover:text-accent"
              >
                Add
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="review" className="mb-1 block text-sm text-muted">
              Review <span className="text-muted/60">(optional)</span>
            </label>
            <textarea
              id="review"
              rows={3}
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Add a review…"
              className="w-full resize-y rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2">
          {existing && (
            <button
              type="button"
              onClick={() => onRemove(existing.key)}
              className="rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-400/10"
            >
              Remove
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-4 py-2 text-sm hover:border-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-black hover:brightness-110"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
