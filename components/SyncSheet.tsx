"use client";

import Sheet from "./Sheet";
import { supabase } from "@/lib/supabase";
import type { SyncStatus } from "@/lib/useSyncedList";

export const STATUS_TEXT: Record<SyncStatus, string> = {
  local: "Saved on this device only",
  syncing: "Syncing…",
  synced: "Synced across your devices",
  offline: "Offline: changes will sync when you're back online",
  error: "Couldn't reach Supabase: changes are queued",
};

export const STATUS_DOT: Record<SyncStatus, string> = {
  local: "bg-muted",
  syncing: "bg-star animate-pulse",
  synced: "bg-accent",
  offline: "bg-star",
  error: "bg-red-400",
};

export default function SyncSheet({
  status,
  canExport,
  onImport,
  onExport,
  onSync,
  onClose,
}: {
  status: SyncStatus;
  canExport: boolean;
  onImport: () => void;
  onExport: () => void;
  onSync: () => void;
  onClose: () => void;
}) {
  const btn = "flex-1 rounded-lg border border-line px-4 py-2.5 text-sm hover:border-accent hover:text-accent disabled:opacity-40";

  return (
    <Sheet label="Sync and backup" onClose={onClose} className="sm:max-w-sm">
      <h2 className="text-lg font-semibold">Sync &amp; backup</h2>
      <p className="mt-1 flex items-center gap-2 text-sm text-muted">
        <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[status]}`} aria-hidden />
        {STATUS_TEXT[status]}
      </p>

      {supabase ? (
        <button type="button" onClick={onSync} className={`${btn} mt-4 w-full`}>
          Sync now
        </button>
      ) : (
        <p className="mt-4 rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-muted">
          Sync isn&apos;t set up. Add your Supabase URL and key (see the README) to share ratings between devices.
        </p>
      )}

      <div className="mt-6 border-t border-line pt-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-muted">Backup</p>
        <div className="flex gap-2">
          <button type="button" onClick={onImport} className={btn}>
            Import
          </button>
          <button type="button" onClick={onExport} disabled={!canExport} className={btn}>
            Export
          </button>
        </div>
      </div>
    </Sheet>
  );
}
