"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateOptionList,
  updateRatios,
  updateSpeciesList,
} from "@/lib/actions";
import { SpeciesOption } from "@/lib/defaults";
import { AppSettings } from "@/lib/settings";

export function SettingsView({ settings }: { settings: AppSettings }) {
  return (
    <div className="space-y-6 pb-6">
      <RatiosSection
        pda={settings.pdaGramsPerLiter}
        antibiotic={settings.antibioticMgPerLiter}
      />
      <SpeciesSection initial={settings.species} />
      <StringListSection
        title="Sterilization methods"
        listKey="sterilizationMethods"
        initial={settings.sterilizationMethods}
      />
      <StringListSection
        title="Zones"
        listKey="zones"
        initial={settings.zones}
      />
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ink-600 bg-ink-800 p-4">
      <h2 className="mb-3 text-sm font-semibold text-zinc-200">{title}</h2>
      {children}
    </section>
  );
}

function Saved({ show }: { show: boolean }) {
  if (!show) return null;
  return <span className="text-xs font-medium text-moss-400">Saved ✓</span>;
}

function SaveBtn({
  onClick,
  pending,
}: {
  onClick: () => void;
  pending: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-xl bg-moss-600 px-4 py-2 text-sm font-semibold text-ink-900 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

function RatiosSection({ pda, antibiotic }: { pda: number; antibiotic: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdaVal, setPdaVal] = useState(String(pda));
  const [antiVal, setAntiVal] = useState(String(antibiotic));

  const save = () => {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updateRatios({
        pdaGramsPerLiter: Number(pdaVal),
        antibioticMgPerLiter: Number(antiVal),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else setError(res.error);
    });
  };

  return (
    <Card title="Base ratios">
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs text-zinc-400">PDA agar (g per 1000 ml)</span>
          <input
            type="number"
            inputMode="decimal"
            value={pdaVal}
            onChange={(e) => setPdaVal(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-500 bg-ink-700 px-3 py-2.5 text-zinc-100"
          />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-400">Antibiotic (mg per L)</span>
          <input
            type="number"
            inputMode="decimal"
            value={antiVal}
            onChange={(e) => setAntiVal(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-500 bg-ink-700 px-3 py-2.5 text-zinc-100"
          />
        </label>
      </div>
      {error && <p className="mt-2 text-sm text-status-contaminated">{error}</p>}
      <div className="mt-3 flex items-center gap-3">
        <SaveBtn onClick={save} pending={pending} />
        <Saved show={saved} />
      </div>
    </Card>
  );
}

function SpeciesSection({ initial }: { initial: SpeciesOption[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SpeciesOption[]>(
    initial.length ? initial : [{ name: "", code: "" }],
  );

  const update = (i: number, patch: Partial<SpeciesOption>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const removeRow = (i: number) =>
    setRows((r) => r.filter((_, idx) => idx !== i));
  const addRow = () => setRows((r) => [...r, { name: "", code: "" }]);

  const save = () => {
    setError(null);
    setSaved(false);
    const cleaned = rows
      .map((r) => ({ name: r.name.trim(), code: r.code.trim().toUpperCase() }))
      .filter((r) => r.name && r.code);
    start(async () => {
      const res = await updateSpeciesList({ values: cleaned });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else setError(res.error);
    });
  };

  return (
    <Card title="Species (name + ID code)">
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={row.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Auricularia sp."
              className="min-w-0 flex-1 rounded-xl border border-ink-500 bg-ink-700 px-3 py-2.5 text-sm text-zinc-100"
            />
            <input
              value={row.code}
              onChange={(e) => update(i, { code: e.target.value.toUpperCase() })}
              placeholder="AUR"
              maxLength={4}
              className="w-20 rounded-xl border border-ink-500 bg-ink-700 px-3 py-2.5 text-center text-sm uppercase text-zinc-100"
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              aria-label="Remove"
              className="shrink-0 rounded-lg px-2 py-2 text-zinc-500"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addRow}
        className="mt-2 text-sm font-medium text-moss-400"
      >
        + Add species
      </button>
      {error && <p className="mt-2 text-sm text-status-contaminated">{error}</p>}
      <div className="mt-3 flex items-center gap-3">
        <SaveBtn onClick={save} pending={pending} />
        <Saved show={saved} />
      </div>
    </Card>
  );
}

function StringListSection({
  title,
  listKey,
  initial,
}: {
  title: string;
  listKey: "sterilizationMethods" | "zones";
  initial: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<string[]>(initial.length ? initial : [""]);

  const update = (i: number, v: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? v : row)));
  const removeRow = (i: number) =>
    setRows((r) => r.filter((_, idx) => idx !== i));
  const addRow = () => setRows((r) => [...r, ""]);

  const save = () => {
    setError(null);
    setSaved(false);
    const cleaned = rows.map((r) => r.trim()).filter(Boolean);
    start(async () => {
      const res = await updateOptionList({ key: listKey, values: cleaned });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else setError(res.error);
    });
  };

  return (
    <Card title={title}>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={row}
              onChange={(e) => update(i, e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-ink-500 bg-ink-700 px-3 py-2.5 text-sm text-zinc-100"
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              aria-label="Remove"
              className="shrink-0 rounded-lg px-2 py-2 text-zinc-500"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addRow}
        className="mt-2 text-sm font-medium text-moss-400"
      >
        + Add
      </button>
      {error && <p className="mt-2 text-sm text-status-contaminated">{error}</p>}
      <div className="mt-3 flex items-center gap-3">
        <SaveBtn onClick={save} pending={pending} />
        <Saved show={saved} />
      </div>
    </Card>
  );
}
