import { prisma } from "./db";
import {
  DEFAULT_ANTIBIOTIC_CONSUMABLE_NAME,
  DEFAULT_ANTIBIOTIC_MG_PER_LITER,
  DEFAULT_PDA_CONSUMABLE_NAME,
  DEFAULT_PDA_GRAMS_PER_LITER,
  DEFAULT_SPECIES,
  DEFAULT_STERILIZATION_METHODS,
  DEFAULT_ZONES,
  SETTING_KEYS,
  SpeciesOption,
} from "./defaults";

async function getRaw(key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

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

export type AppSettings = {
  pdaGramsPerLiter: number;
  antibioticMgPerLiter: number;
  pdaConsumableName: string;
  antibioticConsumableName: string;
  species: SpeciesOption[];
  sterilizationMethods: string[];
  zones: string[];
};

// Reads the full settings object, applying defaults for any unset keys.
export async function getSettings(): Promise<AppSettings> {
  const rows = await prisma.setting.findMany();
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

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

// Derives a 3-letter species code from settings; falls back to the first
// alphabetic characters of the name if the species isn't in the list.
export function codeForSpecies(species: string, list: SpeciesOption[]): string {
  const match = list.find((s) => s.name === species);
  if (match) return match.code.toUpperCase();
  const letters = species.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return (letters.slice(0, 3) || "GEN").padEnd(3, "X");
}
