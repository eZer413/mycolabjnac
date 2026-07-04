"use client";

import { useEffect, useState, useTransition } from "react";
import { createBatch } from "@/lib/local/store";
import { SpeciesOption } from "@/lib/defaults";
import { Chip } from "./Chip";

export type NewBatchDefaults = {
  species: string;
  zone: string;
  sterilizationMethod: string;
  quantity: number;
  pdaBatchRef: string;
};

export type NewBatchOptions = {
  species: SpeciesOption[];
  zones: string[];
  sterilizationMethods: string[];
};

function todayLocalISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

export function NewBatchModal({
  open,
  onClose,
  options,
  defaults,
}: {
  open: boolean;
  onClose: () => void;
  options: NewBatchOptions;
  defaults: NewBatchDefaults;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [species, setSpecies] = useState(defaults.species);
  const [zone, setZone] = useState(defaults.zone);
  const [method, setMethod] = useState(defaults.sterilizationMethod);
  const [date, setDate] = useState(todayLocalISO());
  const [quantity, setQuantity] = useState(defaults.quantity);
  const [pdaBatchRef, setPdaBatchRef] = useState(defaults.pdaBatchRef);
  const [notes, setNotes] = useState("");

  // Re-apply last-used defaults each time the sheet is opened.
  useEffect(() => {
    if (open) {
      setSpecies(defaults.species);
      setZone(defaults.zone);
      setMethod(defaults.sterilizationMethod);
      setDate(todayLocalISO());
      setQuantity(defaults.quantity);
      setPdaBatchRef(defaults.pdaBatchRef);
      setNotes("");
      setError(null);
    }
  }, [open, defaults]);

  if (!open) return null;

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await createBatch({
        species,
        zone,
        sterilizationMethod: method,
        inoculationDate: date,
        quantity,
        pdaBatchRef,
        notes,
      });
      if (res.ok) {
        onClose();
      } else {
        setError(res.error);
      }
    });
  };

  const step = (n: number) => setQuantity((q) => Math.max(1, q + n));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-label="New batch"
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-ink-500 bg-ink-800 p-5 pb-8 shadow-2xl"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ink-500" />
        <h2 className="mb-4 text-lg font-semibold">New batch</h2>

        <Field label="Species">
          <div className="flex flex-wrap gap-2">
            {options.species.map((s) => (
              <Chip
                key={s.code}
                selected={species === s.name}
                onClick={() => setSpecies(s.name)}
              >
                {s.name}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Zone">
          <div className="flex flex-wrap gap-2">
            {options.zones.map((z) => (
              <Chip key={z} selected={zone === z} onClick={() => setZone(z)}>
                {z}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Sterilization">
          <div className="flex flex-wrap gap-2">
            {options.sterilizationMethods.map((m) => (
              <Chip key={m} selected={method === m} onClick={() => setMethod(m)}>
                {m}
              </Chip>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Inoculation date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-ink-500 bg-ink-700 px-3 py-2.5 text-zinc-100"
            />
          </Field>
          <Field label="Quantity (bags/plates)">
            <div className="flex items-center gap-2">
              <StepBtn onClick={() => step(-10)}>−</StepBtn>
              <input
                type="number"
                inputMode="numeric"
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, Number(e.target.value) || 1))
                }
                className="w-full rounded-xl border border-ink-500 bg-ink-700 px-2 py-2.5 text-center text-zinc-100"
              />
              <StepBtn onClick={() => step(10)}>+</StepBtn>
            </div>
          </Field>
        </div>

        <Field label="PDA batch ref (optional)">
          <input
            type="text"
            value={pdaBatchRef}
            onChange={(e) => setPdaBatchRef(e.target.value)}
            placeholder="e.g. PDA-06"
            className="w-full rounded-xl border border-ink-500 bg-ink-700 px-3 py-2.5 text-zinc-100"
          />
        </Field>

        <Field label="Notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-ink-500 bg-ink-700 px-3 py-2.5 text-zinc-100"
          />
        </Field>

        <p className="mb-3 text-xs text-zinc-500">
          Outcome defaults to <span className="text-status-clean">Clean</span>.
          Update it later from the batch list.
        </p>

        {error && (
          <p className="mb-3 rounded-lg bg-status-contaminated/15 px-3 py-2 text-sm text-status-contaminated">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-ink-500 bg-ink-700 py-3 font-medium text-zinc-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="flex-[2] rounded-xl bg-moss-600 py-3 font-semibold text-ink-900 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save batch"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function StepBtn({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-11 w-11 shrink-0 rounded-xl border border-ink-500 bg-ink-700 text-xl font-bold text-zinc-200 active:bg-ink-600"
    >
      {children}
    </button>
  );
}
