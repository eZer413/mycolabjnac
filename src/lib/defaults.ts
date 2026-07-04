// Default values used to seed the Setting key/value store and consumables.
// Everything here is editable at runtime from the Settings screen — code never
// needs to be touched to change protocol.

export type SpeciesOption = { name: string; code: string };

export const SETTING_KEYS = {
  pdaGramsPerLiter: "pda_grams_per_liter", // PDA agar grams per 1000 ml
  antibioticMgPerLiter: "antibiotic_mg_per_liter", // MYCIPEN-MD mg per 1 L
  pdaConsumableName: "pda_consumable_name", // which consumable "log prep" deducts PDA from
  antibioticConsumableName: "antibiotic_consumable_name", // which consumable "log prep" deducts antibiotic from
  species: "species", // JSON: SpeciesOption[]
  sterilizationMethods: "sterilization_methods", // JSON: string[]
  zones: "zones", // JSON: string[]
} as const;

export const DEFAULT_PDA_GRAMS_PER_LITER = 39; // 39 g per 1000 ml
// Antibiotic dosed by syringe in cc: 0.1 cc per 200 ml == 0.5 cc per 1000 ml.
export const DEFAULT_ANTIBIOTIC_MG_PER_LITER = 0.5; // cc per L

export const DEFAULT_SPECIES: SpeciesOption[] = [
  { name: "Auricularia sp.", code: "AUR" },
  { name: "Pleurotus sp.", code: "PLE" },
];

export const DEFAULT_STERILIZATION_METHODS: string[] = [
  "Pressure cooker",
  "Autoclave",
  "Steam (tyndallization)",
];

export const DEFAULT_ZONES: string[] = ["Lab", "Incubation", "Fruiting tent"];

export const DEFAULT_PDA_CONSUMABLE_NAME = "PDA agar";
export const DEFAULT_ANTIBIOTIC_CONSUMABLE_NAME = "Antibiotic";

export const DEFAULT_CONSUMABLES = [
  { name: "PDA agar", unit: "g", stock: 1000, threshold: 200 },
  { name: "Antibiotic", unit: "cc", stock: 30, threshold: 5 },
  { name: "Cling wrap", unit: "rolls", stock: 4, threshold: 1 },
  { name: "Isopropyl alcohol", unit: "L", stock: 5, threshold: 1 },
  { name: "Grains", unit: "kg", stock: 5, threshold: 1 },
  { name: "Scalpel blade", unit: "pcs", stock: 20, threshold: 10 },
];

export const OUTCOMES = ["CLEAN", "CONTAMINATED", "FRUITED", "DISCARDED"] as const;
export type Outcome = (typeof OUTCOMES)[number];

export const OUTCOME_META: Record<
  Outcome,
  { label: string; dot: string; text: string }
> = {
  CLEAN: { label: "Clean", dot: "bg-status-clean", text: "text-status-clean" },
  CONTAMINATED: {
    label: "Contaminated",
    dot: "bg-status-contaminated",
    text: "text-status-contaminated",
  },
  FRUITED: { label: "Fruited", dot: "bg-status-fruited", text: "text-status-fruited" },
  DISCARDED: {
    label: "Discarded",
    dot: "bg-status-discarded",
    text: "text-status-discarded",
  },
};
