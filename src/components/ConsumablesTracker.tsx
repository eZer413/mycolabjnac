"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setConsumableThreshold, stepConsumable } from "@/lib/actions";

export type ConsumableRow = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  threshold: number;
};

// Step size per unit — bigger steps for high-count units.
const STEP_BY_UNIT: Record<string, number> = {
  g: 50,
  mg: 100,
  kg: 1,
  L: 1,
  rolls: 1,
  pcs: 5,
  pairs: 5,
};

export function ConsumablesTracker({ items }: { items: ConsumableRow[] }) {
  const lowCount = items.filter((i) => i.stock <= i.threshold).length;
  return (
    <div className="pb-4">
      {lowCount > 0 && (
        <p className="mb-4 rounded-xl bg-status-contaminated/15 px-4 py-2.5 text-sm font-medium text-status-contaminated">
          {lowCount} item{lowCount > 1 ? "s" : ""} at or below threshold.
        </p>
      )}
      <ul className="space-y-3">
        {items.map((c) => (
          <ConsumableCard key={c.id} item={c} />
        ))}
      </ul>
    </div>
  );
}

function ConsumableCard({ item }: { item: ConsumableRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingThreshold, setEditingThreshold] = useState(false);
  const [threshold, setThreshold] = useState(String(item.threshold));
  const step = STEP_BY_UNIT[item.unit] ?? 1;
  const low = item.stock <= item.threshold;

  const doStep = (delta: number) => {
    startTransition(async () => {
      await stepConsumable({ id: item.id, delta });
      router.refresh();
    });
  };

  const saveThreshold = () => {
    startTransition(async () => {
      const res = await setConsumableThreshold({
        id: item.id,
        threshold: Number(threshold),
      });
      if (res.ok) {
        setEditingThreshold(false);
        router.refresh();
      }
    });
  };

  return (
    <li
      className={[
        "rounded-2xl border bg-ink-800 p-4",
        low ? "border-status-contaminated/60" : "border-ink-600",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold">
            {item.name}
            {low && (
              <span className="rounded-full bg-status-contaminated/20 px-2 py-0.5 text-[11px] font-medium text-status-contaminated">
                LOW
              </span>
            )}
          </p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums">
            {trim(item.stock)}
            <span className="ml-1 text-sm font-medium text-zinc-400">
              {item.unit}
            </span>
          </p>
        </div>

        {/* +/- steppers */}
        <div className="flex items-center gap-2">
          <StepBtn onClick={() => doStep(-step)} disabled={pending}>
            −
          </StepBtn>
          <span className="w-10 text-center text-xs text-zinc-500">{step}</span>
          <StepBtn onClick={() => doStep(step)} disabled={pending}>
            +
          </StepBtn>
        </div>
      </div>

      {/* Threshold row */}
      <div className="mt-3 flex items-center justify-between border-t border-ink-700 pt-3 text-sm">
        <span className="text-zinc-500">Low-stock threshold</span>
        {editingThreshold ? (
          <span className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="w-20 rounded-lg border border-ink-500 bg-ink-700 px-2 py-1 text-right text-zinc-100"
            />
            <button
              type="button"
              onClick={saveThreshold}
              disabled={pending}
              className="rounded-lg bg-moss-600 px-3 py-1 text-xs font-semibold text-ink-900"
            >
              Save
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setThreshold(String(item.threshold));
              setEditingThreshold(true);
            }}
            className="flex items-center gap-2 tabular-nums text-zinc-200"
          >
            {trim(item.threshold)} {item.unit}
            <span className="text-xs text-moss-400">Edit</span>
          </button>
        )}
      </div>
    </li>
  );
}

function StepBtn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-12 w-12 rounded-xl border border-ink-500 bg-ink-700 text-2xl font-bold text-zinc-200 active:bg-ink-600 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}
