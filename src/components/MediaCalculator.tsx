"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logMediaPrep } from "@/lib/actions";

const QUICK_VOLUMES = [250, 500, 1000, 2000];

export function MediaCalculator({
  pdaGramsPerLiter,
  antibioticMgPerLiter,
  pdaConsumableName,
  antibioticConsumableName,
}: {
  pdaGramsPerLiter: number;
  antibioticMgPerLiter: number;
  pdaConsumableName: string;
  antibioticConsumableName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [volume, setVolume] = useState<number>(1000);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { pdaGrams, antibioticMg } = useMemo(() => {
    const v = Number.isFinite(volume) && volume > 0 ? volume : 0;
    return {
      pdaGrams: (v / 1000) * pdaGramsPerLiter,
      antibioticMg: (v / 1000) * antibioticMgPerLiter,
    };
  }, [volume, pdaGramsPerLiter, antibioticMgPerLiter]);

  const logPrep = () => {
    setError(null);
    setFlash(null);
    startTransition(async () => {
      const res = await logMediaPrep({ volumeMl: volume });
      if (res.ok) {
        setFlash(
          `Logged: −${round(res.data!.pdaGrams)} g ${pdaConsumableName}, −${round(
            res.data!.antibioticMg,
          )} mg ${antibioticConsumableName}.`,
        );
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="pb-4">
      {/* Volume input */}
      <div className="mb-4 rounded-2xl border border-ink-600 bg-ink-800 p-4">
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-400">
          Target volume (ml)
        </label>
        <input
          type="number"
          inputMode="numeric"
          value={Number.isNaN(volume) ? "" : volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-full rounded-xl border border-ink-500 bg-ink-700 px-4 py-3 text-2xl font-semibold text-zinc-100"
        />
        <div className="mt-3 grid grid-cols-4 gap-2">
          {QUICK_VOLUMES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVolume(v)}
              className={[
                "rounded-xl py-2.5 text-sm font-semibold",
                volume === v
                  ? "bg-moss-600 text-ink-900"
                  : "border border-ink-500 bg-ink-700 text-zinc-200",
              ].join(" ")}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <ResultCard
          label="PDA agar"
          value={round(pdaGrams)}
          unit="g"
          hint={`${pdaGramsPerLiter} g / 1000 ml`}
        />
        <ResultCard
          label={antibioticConsumableName}
          value={round(antibioticMg)}
          unit="mg"
          hint={`${antibioticMgPerLiter} mg / L`}
        />
      </div>

      {flash && (
        <p className="mb-3 rounded-lg bg-moss-600/15 px-3 py-2 text-sm text-moss-400">
          {flash}
        </p>
      )}
      {error && (
        <p className="mb-3 rounded-lg bg-status-contaminated/15 px-3 py-2 text-sm text-status-contaminated">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={logPrep}
        disabled={pending || !(volume > 0)}
        className="w-full rounded-2xl bg-moss-600 py-4 text-base font-semibold text-ink-900 disabled:opacity-60"
      >
        {pending ? "Logging…" : "Log prep & deduct stock"}
      </button>
      <p className="mt-2 text-center text-xs text-zinc-500">
        Deducts the calculated amounts from {pdaConsumableName} and{" "}
        {antibioticConsumableName}.
      </p>
    </div>
  );
}

function ResultCard({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: number;
  unit: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-ink-600 bg-ink-800 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold text-moss-400">
        {value}
        <span className="ml-1 text-base font-medium text-zinc-400">{unit}</span>
      </p>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
