"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { countPending, useSync } from "@/lib/sync/useSync";

// Compact cloud-sync status pill, fixed to the top of the screen. Hidden
// entirely when sync isn't configured, so an offline-only setup stays clean.
export function SyncIndicator() {
  const { status, lastSyncedAt, error, sync } = useSync();
  // Reactive pending count: reflects offline edits the moment they're made.
  const pending = useLiveQuery(countPending, [], 0);

  if (status === "disabled") return null;

  // On error, show the real message so a failure is diagnosable on-device
  // instead of a generic "error". Tapping still retries.
  if (status === "error") {
    return (
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center px-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 4px)" }}
      >
        <button
          type="button"
          onClick={() => sync()}
          className="pointer-events-auto max-w-[94vw] rounded-2xl border border-status-contaminated/50 bg-ink-800/95 px-3 py-1.5 text-left text-[11px] font-medium text-status-contaminated backdrop-blur"
        >
          <span className="block">Sync error — tap to retry</span>
          {error && (
            <span className="mt-0.5 block break-words font-normal text-status-contaminated/80">
              {error}
            </span>
          )}
        </button>
      </div>
    );
  }

  const label =
    status === "syncing"
      ? "Syncing…"
      : status === "offline"
        ? `Offline${pending ? ` · ${pending} pending` : ""}`
        : pending > 0
          ? `${pending} pending — tap to sync`
          : `Synced${lastSyncedAt ? ` · ${timeAgo(lastSyncedAt)}` : ""}`;

  const tone =
    status === "syncing"
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
