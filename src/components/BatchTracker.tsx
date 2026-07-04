"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteBatch, updateBatch } from "@/lib/local/store";
import { OUTCOME_META, OUTCOMES, Outcome } from "@/lib/defaults";

export type BatchRow = {
  id: string;
  species: string;
  quantity: number;
  pdaBatchRef: string | null;
  sterilizationMethod: string;
  inoculationDate: string; // ISO
  zone: string;
  outcome: string;
  notes: string | null;
};

const FILTERS: Array<{ key: "ALL" | Outcome; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "CLEAN", label: "Clean" },
  { key: "CONTAMINATED", label: "Contam." },
  { key: "FRUITED", label: "Fruited" },
  { key: "DISCARDED", label: "Discarded" },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA"); // yyyy-mm-dd, locale-stable
}

export function BatchTracker({ batches }: { batches: BatchRow[] }) {
  const [filter, setFilter] = useState<"ALL" | Outcome>("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: batches.length };
    for (const b of batches) c[b.outcome] = (c[b.outcome] ?? 0) + 1;
    return c;
  }, [batches]);

  const visible =
    filter === "ALL" ? batches : batches.filter((b) => b.outcome === filter);

  return (
    <div className="pb-4">
      {/* Filter row */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={[
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium",
              filter === f.key
                ? "bg-moss-600 text-ink-900"
                : "border border-ink-500 bg-ink-700 text-zinc-300",
            ].join(" ")}
          >
            {f.label}
            <span className="ml-1.5 opacity-70">{counts[f.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-2.5">
          {visible.map((b) => (
            <BatchCard
              key={b.id}
              batch={b}
              open={expanded === b.id}
              onToggle={() =>
                setExpanded((cur) => (cur === b.id ? null : b.id))
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function BatchCard({
  batch,
  open,
  onToggle,
}: {
  batch: BatchRow;
  open: boolean;
  onToggle: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState(batch.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const meta = OUTCOME_META[batch.outcome as Outcome] ?? OUTCOME_META.CLEAN;

  const save = (outcome: Outcome) => {
    setError(null);
    startTransition(async () => {
      const res = await updateBatch({ id: batch.id, outcome, notes });
      if (!res.ok) setError(res.error);
    });
  };

  const remove = () => {
    startTransition(async () => {
      const res = await deleteBatch(batch.id);
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <li className="overflow-hidden rounded-2xl border border-ink-600 bg-ink-800">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className={`h-3 w-3 shrink-0 rounded-full ${meta.dot}`} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate font-semibold">{batch.id}</span>
            <span className={`shrink-0 text-xs font-medium ${meta.text}`}>
              {meta.label}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-sm text-zinc-400">
            {batch.species} · {batch.quantity} · {batch.zone}
          </span>
        </span>
      </button>

      {open && (
        <div className="border-t border-ink-600 px-4 py-4">
          <dl className="mb-4 grid grid-cols-2 gap-y-2 text-sm">
            <Info label="Inoculated" value={fmtDate(batch.inoculationDate)} />
            <Info label="Sterilization" value={batch.sterilizationMethod} />
            <Info label="PDA ref" value={batch.pdaBatchRef || "—"} />
            <Info label="Quantity" value={String(batch.quantity)} />
          </dl>

          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
            Update outcome
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {OUTCOMES.map((o) => {
              const om = OUTCOME_META[o];
              const active = batch.outcome === o;
              return (
                <button
                  key={o}
                  type="button"
                  disabled={pending}
                  onClick={() => save(o)}
                  className={[
                    "flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium",
                    active
                      ? "border-transparent bg-ink-600"
                      : "border-ink-500 bg-ink-700",
                  ].join(" ")}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${om.dot}`} />
                  {om.label}
                </button>
              );
            })}
          </div>

          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Add an observation…"
            className="mb-3 w-full rounded-xl border border-ink-500 bg-ink-700 px-3 py-2.5 text-sm text-zinc-100"
          />

          {error && (
            <p className="mb-3 text-sm text-status-contaminated">{error}</p>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => save(batch.outcome as Outcome)}
              disabled={pending}
              className="rounded-xl bg-moss-600 px-4 py-2.5 text-sm font-semibold text-ink-900 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save notes"}
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="text-sm font-medium text-status-discarded"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-zinc-200">{value}</dd>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-ink-500 px-6 py-12 text-center">
      <p className="text-zinc-400">No batches here yet.</p>
      <p className="mt-1 text-sm text-zinc-500">
        Tap the center <span className="font-bold text-moss-400">+</span> to log
        one.
      </p>
    </div>
  );
}
