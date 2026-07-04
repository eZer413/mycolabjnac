// MycoLab — local-first data layer. These functions are the client-side twins
// of the old server actions in src/lib/actions.ts: identical names, inputs, and
// { ok, data } / { ok, error } return shape, but every read and write hits the
// on-device Dexie database instead of the server. The UI can call these with
// zero signal. Business rules (validation, id generation, media math, stock
// deduction) are reused unchanged from the existing pure modules.
import { db, nowISO, type BatchRecord } from "./db";
import type { BatchRow } from "@/components/BatchTracker";
import type { ConsumableRow } from "@/components/ConsumablesTracker";
import type { MediaPrepRow } from "@/components/MediaPrepList";
import type {
  NewBatchDefaults,
  NewBatchOptions,
} from "@/components/NewBatchModal";
import {
  DEFAULT_ANTIBIOTIC_CONSUMABLE_NAME,
  DEFAULT_ANTIBIOTIC_MG_PER_LITER,
  DEFAULT_PDA_CONSUMABLE_NAME,
  DEFAULT_PDA_GRAMS_PER_LITER,
  DEFAULT_SPECIES,
  DEFAULT_STERILIZATION_METHODS,
  DEFAULT_ZONES,
  SETTING_KEYS,
  type SpeciesOption,
} from "../defaults";
import { buildPatternReport, type PatternReport } from "../patterns";
import {
  consumableStepSchema,
  consumableThresholdSchema,
  createBatchSchema,
  logMediaPrepSchema,
  optionListSchema,
  ratiosSchema,
  speciesListSchema,
  updateBatchSchema,
} from "../validation";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function firstError(e: unknown): string {
  if (e && typeof e === "object" && "issues" in e) {
    const issues = (e as { issues?: Array<{ message: string }> }).issues;
    if (issues && issues.length) return issues[0].message;
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}

// ---------- Settings ----------

export type AppSettings = {
  pdaGramsPerLiter: number;
  antibioticMgPerLiter: number;
  pdaConsumableName: string;
  antibioticConsumableName: string;
  species: SpeciesOption[];
  sterilizationMethods: string[];
  zones: string[];
};

function parseJson<T>(raw: string | null, fallback: T): T {
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseNumber(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export async function getSettings(): Promise<AppSettings> {
  const rows = await db().settings.toArray();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const get = (k: string) => map.get(k) ?? null;

  return {
    pdaGramsPerLiter: parseNumber(
      get(SETTING_KEYS.pdaGramsPerLiter),
      DEFAULT_PDA_GRAMS_PER_LITER,
    ),
    antibioticMgPerLiter: parseNumber(
      get(SETTING_KEYS.antibioticMgPerLiter),
      DEFAULT_ANTIBIOTIC_MG_PER_LITER,
    ),
    pdaConsumableName:
      get(SETTING_KEYS.pdaConsumableName) ?? DEFAULT_PDA_CONSUMABLE_NAME,
    antibioticConsumableName:
      get(SETTING_KEYS.antibioticConsumableName) ??
      DEFAULT_ANTIBIOTIC_CONSUMABLE_NAME,
    species: parseJson<SpeciesOption[]>(
      get(SETTING_KEYS.species),
      DEFAULT_SPECIES,
    ),
    sterilizationMethods: parseJson<string[]>(
      get(SETTING_KEYS.sterilizationMethods),
      DEFAULT_STERILIZATION_METHODS,
    ),
    zones: parseJson<string[]>(get(SETTING_KEYS.zones), DEFAULT_ZONES),
  };
}

async function setSetting(key: string, value: string): Promise<void> {
  await db().settings.put({ key, value, updatedAt: nowISO() });
}

// Derives a species' 3-letter code from settings; falls back to the first
// alphabetic characters of the name. (Pure — mirrors settings.ts.)
function codeForSpecies(species: string, list: SpeciesOption[]): string {
  const match = list.find((s) => s.name === species);
  if (match) return match.code.toUpperCase();
  const letters = species.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return (letters.slice(0, 3) || "GEN").padEnd(3, "X");
}

// ---------- Reads (used by the screens via useLiveQuery) ----------

async function liveBatches(): Promise<BatchRecord[]> {
  const all = await db().batches.toArray();
  return all
    .filter((b) => b.deletedAt === null)
    .sort(
      (a, b) =>
        b.inoculationDate.localeCompare(a.inoculationDate) ||
        b.createdAt.localeCompare(a.createdAt),
    );
}

export async function listBatches(): Promise<BatchRow[]> {
  const batches = await liveBatches();
  return batches.map((b) => ({
    id: b.id,
    species: b.species,
    quantity: b.quantity,
    pdaBatchRef: b.pdaBatchRef,
    sterilizationMethod: b.sterilizationMethod,
    inoculationDate: b.inoculationDate,
    zone: b.zone,
    outcome: b.outcome,
    notes: b.notes,
  }));
}

export async function getPatternReport(): Promise<PatternReport> {
  const batches = await liveBatches();
  return buildPatternReport(
    batches.map((b) => ({
      outcome: b.outcome,
      sterilizationMethod: b.sterilizationMethod,
      zone: b.zone,
      species: b.species,
    })),
  );
}

export async function listConsumables(): Promise<ConsumableRow[]> {
  const all = await db().consumables.toArray();
  return all
    .filter((c) => c.deletedAt === null)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({
      id: c.id,
      name: c.name,
      unit: c.unit,
      stock: c.stock,
      threshold: c.threshold,
    }));
}

export type MediaContext = {
  pdaGramsPerLiter: number;
  antibioticMgPerLiter: number;
  pdaConsumableName: string;
  antibioticConsumableName: string;
  preps: MediaPrepRow[];
};

export async function getMediaContext(): Promise<MediaContext> {
  const s = await getSettings();
  const all = await db().mediaPreps.toArray();
  const preps = all
    .filter((p) => p.deletedAt === null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 30)
    .map((p) => ({
      id: p.id,
      volumeMl: p.volumeMl,
      pdaGrams: p.pdaGrams,
      antibioticMg: p.antibioticMg,
      createdAt: p.createdAt,
      antibioticLabel: s.antibioticConsumableName,
    }));
  return {
    pdaGramsPerLiter: s.pdaGramsPerLiter,
    antibioticMgPerLiter: s.antibioticMgPerLiter,
    pdaConsumableName: s.pdaConsumableName,
    antibioticConsumableName: s.antibioticConsumableName,
    preps,
  };
}

export type NewBatchContext = {
  options: NewBatchOptions;
  defaults: NewBatchDefaults;
};

// Mirrors the old root-layout logic: last-used batch fields become the defaults
// for the "New batch" sheet.
export async function getNewBatchContext(): Promise<NewBatchContext> {
  const settings = await getSettings();
  const live = (await db().batches.toArray()).filter(
    (b) => b.deletedAt === null,
  );
  live.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const last = live[0];

  return {
    options: {
      species: settings.species,
      zones: settings.zones,
      sterilizationMethods: settings.sterilizationMethods,
    },
    defaults: {
      species: last?.species ?? settings.species[0]?.name ?? "",
      zone: last?.zone ?? settings.zones[0] ?? "",
      sterilizationMethod:
        last?.sterilizationMethod ?? settings.sterilizationMethods[0] ?? "",
      quantity: last?.quantity ?? 100,
      pdaBatchRef: last?.pdaBatchRef ?? "",
    },
  };
}

// ---------- Batches (writes) ----------

// {CODE}-{MMDD}-{NN}, NN = daily sequence per species code. Considers every row
// (including tombstones) so a deleted id is never reused.
async function nextBatchId(
  species: string,
  settings: AppSettings,
): Promise<string> {
  const code = codeForSpecies(species, settings.species);
  const now = new Date();
  const mmdd = `${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  const prefix = `${code}-${mmdd}-`;

  const todays = await db().batches.where("id").startsWith(prefix).toArray();
  const used = new Set(todays.map((b) => b.id));
  let seq = todays.length + 1;
  let id = `${prefix}${String(seq).padStart(2, "0")}`;
  while (used.has(id)) {
    seq += 1;
    id = `${prefix}${String(seq).padStart(2, "0")}`;
  }
  return id;
}

export async function createBatch(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const data = createBatchSchema.parse(input);
    const settings = await getSettings();

    if (!settings.species.some((s) => s.name === data.species))
      return { ok: false, error: "Unknown species." };
    if (!settings.zones.includes(data.zone))
      return { ok: false, error: "Unknown zone." };
    if (!settings.sterilizationMethods.includes(data.sterilizationMethod))
      return { ok: false, error: "Unknown sterilization method." };

    const id = await nextBatchId(data.species, settings);
    const ts = nowISO();
    await db().batches.add({
      id,
      species: data.species,
      quantity: data.quantity,
      pdaBatchRef: data.pdaBatchRef ? data.pdaBatchRef : null,
      sterilizationMethod: data.sterilizationMethod,
      inoculationDate: new Date(data.inoculationDate).toISOString(),
      zone: data.zone,
      outcome: "CLEAN",
      notes: data.notes ? data.notes : null,
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
    });

    return { ok: true, data: { id } };
  } catch (e) {
    return { ok: false, error: firstError(e) };
  }
}

export async function updateBatch(input: unknown): Promise<ActionResult> {
  try {
    const data = updateBatchSchema.parse(input);
    const updated = await db().batches.update(data.id, {
      outcome: data.outcome,
      notes: data.notes ? data.notes : null,
      updatedAt: nowISO(),
    });
    if (!updated) return { ok: false, error: "Batch not found." };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: firstError(e) };
  }
}

export async function deleteBatch(id: string): Promise<ActionResult> {
  try {
    const ts = nowISO();
    // Soft delete: mark a tombstone so the deletion can sync to the cloud.
    const updated = await db().batches.update(id, {
      deletedAt: ts,
      updatedAt: ts,
    });
    if (!updated) return { ok: false, error: "Batch not found." };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: firstError(e) };
  }
}

// ---------- Media ----------

export async function logMediaPrep(
  input: unknown,
): Promise<ActionResult<{ pdaGrams: number; antibioticMg: number }>> {
  try {
    const { volumeMl } = logMediaPrepSchema.parse(input);
    const settings = await getSettings();

    const pdaGrams = (volumeMl / 1000) * settings.pdaGramsPerLiter;
    const antibioticMg = (volumeMl / 1000) * settings.antibioticMgPerLiter;

    // Deduct from stock. Missing consumables are skipped silently — the prep is
    // still recorded; the user just sees no stock change for it.
    const pda = await db()
      .consumables.where("name")
      .equals(settings.pdaConsumableName)
      .first();
    if (pda) {
      await db().consumables.update(pda.id, {
        stock: Math.max(0, pda.stock - pdaGrams),
        updatedAt: nowISO(),
      });
    }
    const anti = await db()
      .consumables.where("name")
      .equals(settings.antibioticConsumableName)
      .first();
    if (anti) {
      await db().consumables.update(anti.id, {
        stock: Math.max(0, anti.stock - antibioticMg),
        updatedAt: nowISO(),
      });
    }

    const ts = nowISO();
    await db().mediaPreps.add({
      id: crypto.randomUUID(),
      volumeMl,
      pdaGrams,
      antibioticMg,
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
    });

    return { ok: true, data: { pdaGrams, antibioticMg } };
  } catch (e) {
    return { ok: false, error: firstError(e) };
  }
}

export async function deleteMediaPrep(id: string): Promise<ActionResult> {
  try {
    const ts = nowISO();
    const updated = await db().mediaPreps.update(id, {
      deletedAt: ts,
      updatedAt: ts,
    });
    if (!updated) return { ok: false, error: "Prep not found." };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: firstError(e) };
  }
}

// ---------- Consumables ----------

export async function stepConsumable(input: unknown): Promise<ActionResult> {
  try {
    const { id, delta } = consumableStepSchema.parse(input);
    const c = await db().consumables.get(id);
    if (!c) return { ok: false, error: "Consumable not found." };
    await db().consumables.update(id, {
      stock: Math.max(0, c.stock + delta),
      updatedAt: nowISO(),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: firstError(e) };
  }
}

export async function setConsumableThreshold(
  input: unknown,
): Promise<ActionResult> {
  try {
    const { id, threshold } = consumableThresholdSchema.parse(input);
    const updated = await db().consumables.update(id, {
      threshold,
      updatedAt: nowISO(),
    });
    if (!updated) return { ok: false, error: "Consumable not found." };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: firstError(e) };
  }
}

// ---------- Settings (writes) ----------

export async function updateRatios(input: unknown): Promise<ActionResult> {
  try {
    const data = ratiosSchema.parse(input);
    await setSetting(SETTING_KEYS.pdaGramsPerLiter, String(data.pdaGramsPerLiter));
    await setSetting(
      SETTING_KEYS.antibioticMgPerLiter,
      String(data.antibioticMgPerLiter),
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: firstError(e) };
  }
}

export async function updateOptionList(input: unknown): Promise<ActionResult> {
  try {
    const { key, values } = optionListSchema.parse(input);
    const unique = Array.from(new Set(values.map((v) => v.trim()))).filter(
      Boolean,
    );
    if (unique.length === 0)
      return { ok: false, error: "Keep at least one option." };
    const settingKey =
      key === "sterilizationMethods"
        ? SETTING_KEYS.sterilizationMethods
        : SETTING_KEYS.zones;
    await setSetting(settingKey, JSON.stringify(unique));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: firstError(e) };
  }
}

export async function updateSpeciesList(input: unknown): Promise<ActionResult> {
  try {
    const { values } = speciesListSchema.parse(input);
    if (values.length === 0)
      return { ok: false, error: "Keep at least one species." };
    const names = new Set<string>();
    const codes = new Set<string>();
    for (const v of values) {
      if (names.has(v.name))
        return { ok: false, error: `Duplicate species: ${v.name}` };
      if (codes.has(v.code))
        return { ok: false, error: `Duplicate code: ${v.code}` };
      names.add(v.name);
      codes.add(v.code);
    }
    await setSetting(SETTING_KEYS.species, JSON.stringify(values));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: firstError(e) };
  }
}
