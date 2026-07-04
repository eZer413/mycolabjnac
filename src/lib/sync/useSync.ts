"use client";

import { useCallback, useEffect, useState } from "react";
import { getTursoClient } from "./client";
import { countPending, getMeta, syncNow } from "./engine";

export type SyncStatus =
  | "disabled" // no credentials configured
  | "offline" // configured, but the device has no connection
  | "syncing"
  | "idle" // successfully synced (or nothing to do)
  | "error";

export type SyncState = {
  status: SyncStatus;
  lastSyncedAt?: string;
  error?: string;
  sync: () => void; // manual trigger
};

const INTERVAL_MS = 30_000;

// Runs background sync for the whole app: once on mount, whenever the device
// comes back online, and on a gentle interval. Safe to leave running with no
// credentials — it simply reports "disabled" and does nothing.
export function useSync(): SyncState {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const run = useCallback(async () => {
    const client = await getTursoClient();
    if (!client) {
      setStatus("disabled");
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("offline");
      return;
    }
    setStatus("syncing");
    setError(undefined);
    try {
      await syncNow();
      setLastSyncedAt(await getMeta("lastSyncedAt"));
      setStatus("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    run();
    const onOnline = () => run();
    window.addEventListener("online", onOnline);
    const id = window.setInterval(run, INTERVAL_MS);
    return () => {
      window.removeEventListener("online", onOnline);
      window.clearInterval(id);
    };
  }, [run]);

  return { status, lastSyncedAt, error, sync: run };
}

export { countPending };
