"use client";

import { useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import Sheet from "./Sheet";
import { supabase } from "@/lib/supabase";
import type { SyncStatus } from "@/lib/useSyncedList";

export const STATUS_TEXT: Record<SyncStatus, string> = {
  local: "Saved on this device only",
  syncing: "Syncing…",
  synced: "Synced",
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

export default function AccountSheet({
  user,
  status,
  canExport,
  onImport,
  onExport,
  onSync,
  onClose,
}: {
  user: User | null;
  status: SyncStatus;
  canExport: boolean;
  onImport: () => void;
  onExport: () => void;
  onSync: () => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const creds = { email: email.trim(), password };
    const { data, error } =
      mode === "in"
        ? await supabase.auth.signInWithPassword(creds)
        : await supabase.auth.signUp({ ...creds, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) setMessage({ text: error.message, error: true });
    else if (mode === "up" && !data.session)
      setMessage({ text: "Check your email to confirm your account, then sign in here." });
    else setPassword("");
  };

  const field =
    "w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-base outline-none placeholder:text-muted focus:border-accent";
  const btn = "rounded-lg border border-line px-4 py-2.5 text-sm hover:border-accent hover:text-accent";

  return (
    <Sheet label="Account and sync" onClose={onClose} className="sm:max-w-sm">
      <h2 className="text-lg font-semibold">Account &amp; sync</h2>
      <p className="mt-1 flex items-center gap-2 text-sm text-muted">
        <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[status]}`} aria-hidden />
        {STATUS_TEXT[status]}
      </p>

      {!supabase ? (
        <p className="mt-4 rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-muted">
          Sync isn&apos;t set up yet. Add your Supabase URL and key to <code>.env.local</code> (see the README) to keep
          your ratings in sync between your Mac and iPhone.
        </p>
      ) : user ? (
        <div className="mt-4 space-y-2">
          <p className="truncate text-sm">
            Signed in as <span className="font-medium">{user.email}</span>
          </p>
          <p className="text-xs text-muted">Sign in with the same account on your other devices to see the same ratings.</p>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onSync} className={`${btn} flex-1`}>
              Sync now
            </button>
            <button
              type="button"
              onClick={() => supabase!.auth.signOut()}
              className="flex-1 rounded-lg border border-line px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10"
            >
              Sign out
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-2">
          <p className="text-xs text-muted">
            Sign in to sync between devices. Ratings already on this device are added to your account.
          </p>
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
          {message && (
            <p role="alert" className={`text-sm ${message.error ? "text-red-300" : "text-accent"}`}>
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "in" ? "up" : "in");
              setMessage(null);
            }}
            className="w-full py-1 text-sm text-muted hover:text-[#e6edf3]"
          >
            {mode === "in" ? "No account? Create one" : "Have an account? Sign in"}
          </button>
        </form>
      )}

      <div className="mt-6 border-t border-line pt-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-muted">Backup</p>
        <div className="flex gap-2">
          <button type="button" onClick={onImport} className={`${btn} flex-1`}>
            Import
          </button>
          <button type="button" onClick={onExport} disabled={!canExport} className={`${btn} flex-1 disabled:opacity-40`}>
            Export
          </button>
        </div>
      </div>
    </Sheet>
  );
}
