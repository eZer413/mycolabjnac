"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMediaPrep } from "@/lib/actions";

export type MediaPrepRow = {
  id: string;
  volumeMl: number;
  pdaGrams: number;
  antibioticMg: number;
  createdAt: string; // ISO
  antibioticLabel: string;
};

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  // e.g. "Jul 4, 2026 · 4:32 PM"
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function MediaPrepList({ preps }: { preps: MediaPrepRow[] }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-semibold text-zinc-300">
        Prep history
        {preps.length > 0 && (
          <span className="ml-1.5 text-zinc-500">({preps.length})</span>
        )}
      </h2>

      {preps.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink-500 px-6 py-8 text-center text-sm text-zinc-500">
          No preps logged yet. Use “Log prep &amp; deduct stock” above and it’ll
          show up here with the date and amounts.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {preps.map((p) => (
            <PrepCard key={p.id} prep={p} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PrepCard({ prep }: { prep: MediaPrepRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const remove = () => {
    startTransition(async () => {
      const res = await deleteMediaPrep(prep.id);
      if (res.ok) router.refresh();
    });
  };

  return (
    <li className="rounded-2xl border border-ink-600 bg-ink-800 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold tabular-nums">
            {round(prep.volumeMl)}
            <span className="ml-1 text-sm font-medium text-zinc-400">ml</span>
          </p>
          <p className="mt-0.5 text-sm text-zinc-400">{fmtWhen(prep.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-sm">
            <p className="text-moss-400 tabular-nums">
              {round(prep.pdaGrams)} g PDA
            </p>
            <p className="text-moss-400 tabular-nums">
              {round(prep.antibioticMg)} mg {prep.antibioticLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label="Delete prep"
            className="shrink-0 rounded-lg px-2 py-2 text-zinc-500 active:text-status-contaminated disabled:opacity-50"
          >
            ✕
          </button>
        </div>
      </div>
    </li>
  );
}
