"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { SettingsView } from "@/components/SettingsView";
import { getSettings } from "@/lib/local/store";

export default function SettingsPage() {
  const settings = useLiveQuery(getSettings, []);

  return (
    <>
      <header className="mb-4 flex items-center gap-3">
        <Link
          href="/batches"
          aria-label="Back"
          className="rounded-full border border-ink-500 bg-ink-700 p-2 text-zinc-300"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </header>
      <p className="mb-4 text-sm text-zinc-400">
        Edit your protocol without touching code. Changes apply to new entries.
      </p>
      {settings && <SettingsView settings={settings} />}
    </>
  );
}
