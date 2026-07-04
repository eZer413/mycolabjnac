"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { SETTING_KEYS } from "./defaults";
import { codeForSpecies, getSettings, setSetting } from "./settings";
import {
  consumableStepSchema,
  consumableThresholdSchema,
  createBatchSchema,
  logMediaPrepSchema,
  optionListSchema,
  ratiosSchema,
  speciesListSchema,
  updateBatchSchema,
} from "./validation";

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

function revalidateAll() {
  revalidatePath("/batches");
  revalidatePath("/media");
  revalidatePath("/patterns");
  revalidatePath("/supplies");
  revalidatePath("/settings");
}

// ---------- Batches ----------

// Generates a human-readable id: {CODE}-{MMDD}-{NN}, where NN is the daily
// sequence per species code. Retries on the rare collision.
async function nextBatchId(species: string): Promise<string> {
  const settings = await getSettings();
  const code = codeForSpecies(species, settings.species);
  const now = new Date();
  const mmdd = `${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  const prefix = `${code}-${mmdd}-`;

  const todays = await prisma.batch.findMany({
    where: { id: { startsWith: prefix } },
    select: { id: true },
  });
  let seq = todays.length + 1;
  // Ensure uniqueness even if some earlier ids were deleted/reused.
  const used = new Set(todays.map((b) => b.id));
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

    // Validate the selected options exist in the current lists.
    if (!settings.species.some((s) => s.name === data.species))
      return { ok: false, error: "Unknown species." };
    if (!settings.zones.includes(data.zone))
      return { ok: false, error: "Unknown zone." };
    if (!settings.sterilizationMethods.includes(data.sterilizationMethod))
      return { ok: false, error: "Unknown sterilization method." };

    const id = await nextBatchId(data.species);
    await prisma.batch.create({
      data: {
        id,
        species: data.species,
        quantity: data.quantity,
        pdaBatchRef: data.pdaBatchRef ? data.pdaBatchRef : null,
        sterilizationMethod: data.sterilizationMethod,
        inoculationDate: new Date(data.inoculationDate),
        zone: data.zone,
        outcome: "CLEAN",
        notes: data.notes ? data.notes : null,
      },
    });

    revalidateAll();
    return { ok: true, data: { id } };
  } catch (e) {
    return { ok: false, error: firstError(e) };
  }
}

export async function updateBatch(input: unknown): Promise<ActionResult> {
  try {
    const data = updateBatchSchema.parse(input);
    await prisma.batch.update({
      where: { id: data.id },
      data: {
        outcome: data.outcome,
        notes: data.notes ? data.notes : null,
      },
    });
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: firstError(e) };
  }
}

export async function deleteBatch(id: string): Promise<ActionResult> {
  try {
    await prisma.batch.delete({ where: { id } });
    revalidateAll();
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
    // still recorded numerically; the user just sees no stock change for it.
    const pda = await prisma.consumable.findUnique({
      where: { name: settings.pdaConsumableName },
    });
    if (pda) {
      await prisma.consumable.update({
        where: { id: pda.id },
        data: { stock: Math.max(0, pda.stock - pdaGrams) },
      });
    }
    const anti = await prisma.consumable.findUnique({
      where: { name: settings.antibioticConsumableName },
    });
    if (anti) {
      await prisma.consumable.update({
        where: { id: anti.id },
        data: { stock: Math.max(0, anti.stock - antibioticMg) },
      });
    }

    // Record a dated history entry for this prep.
    await prisma.mediaPrep.create({
      data: { volumeMl, pdaGrams, antibioticMg },
    });

    revalidateAll();
    return { ok: true, data: { pdaGrams, antibioticMg } };
  } catch (e) {
    return { ok: false, error: firstError(e) };
  }
}

export async function deleteMediaPrep(id: string): Promise<ActionResult> {
  try {
    await prisma.mediaPrep.delete({ where: { id } });
    revalidatePath("/media");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: firstError(e) };
  }
}

// ---------- Consumables ----------

export async function stepConsumable(input: unknown): Promise<ActionResult> {
  try {
    const { id, delta } = consumableStepSchema.parse(input);
    const c = await prisma.consumable.findUnique({ where: { id } });
    if (!c) return { ok: false, error: "Consumable not found." };
    await prisma.consumable.update({
      where: { id },
      data: { stock: Math.max(0, c.stock + delta) },
    });
    revalidatePath("/supplies");
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
    await prisma.consumable.update({ where: { id }, data: { threshold } });
    revalidatePath("/supplies");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: firstError(e) };
  }
}

// ---------- Settings ----------

export async function updateRatios(input: unknown): Promise<ActionResult> {
  try {
    const data = ratiosSchema.parse(input);
    await setSetting(
      SETTING_KEYS.pdaGramsPerLiter,
      String(data.pdaGramsPerLiter),
    );
    await setSetting(
      SETTING_KEYS.antibioticMgPerLiter,
      String(data.antibioticMgPerLiter),
    );
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: firstError(e) };
  }
}

export async function updateOptionList(input: unknown): Promise<ActionResult> {
  try {
    const { key, values } = optionListSchema.parse(input);
    // De-duplicate while preserving order.
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
    revalidateAll();
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
    // Ensure unique names and codes.
    const names = new Set<string>();
    const codes = new Set<string>();
    for (const v of values) {
      if (names.has(v.name)) return { ok: false, error: `Duplicate species: ${v.name}` };
      if (codes.has(v.code)) return { ok: false, error: `Duplicate code: ${v.code}` };
      names.add(v.name);
      codes.add(v.code);
    }
    await setSetting(SETTING_KEYS.species, JSON.stringify(values));
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: firstError(e) };
  }
}
