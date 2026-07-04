"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { countPending, useSync } from "@/lib/sync/useSync";

// Compact cloud-sync status pill, fixed to the top of the screen. Hidden
// entirely when sync isn't configured, so an offline-only setup stays clean.
export function SyncIndicator() {
  const { status, lastSyncedAt, sync } = useSync();
  // Reactive pending count: reflects offline edits the moment they're made.
  const pending = useLiveQuery(countPending, [], 0);

  if (status === "disabled") return null;

  const label =
    status === "syncing"
      ? "Syncing…"
      : status === "offline"
        ? `Offline${pending ? ` · ${pending} pending` : ""}`
        : status === "error"
          ? "Sync error — tap to retry"
          : pending > 0
            ? `${pending} pending — tap to sync`
            : `Synced${lastSyncedAt ? ` · ${timeAgo(lastSyncedAt)}` : ""}`;

  const tone =
    status === "error"
      ? "border-status-contaminated/50 text-status-contaminated"
      : status === "offline"
        ? "border-ink-500 text-zinc-400"
        : status === "syncing"
          ? "border-moss-500/50 text-moss-400"
          : "border-ink-500 text-zinc-400";

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 4px)" }}
    >
      <button
        type="button"
        onClick={() => sync()}
        className={`pointer-events-auto flex items-center gap-1.5 rounded-full border bg-ink-800/90 px-3 py-1 text-[11px] font-medium backdrop-blur ${tone}`}
      >
        <span
          className={[
            "h-1.5 w-1.5 rounded-full",
            status === "syncing"
              ? "animate-pulse bg-moss-400"
              : status === "error"
                ? "bg-status-contaminated"
                : status === "offline"
                  ? "bg-zinc-500"
                  : pending > 0
                    ? "bg-amber-400"
                    : "bg-moss-500",
          ].join(" ")}
        />
        {label}
      </button>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
