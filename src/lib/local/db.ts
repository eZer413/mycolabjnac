// MycoLab — on-device database (Dexie, wrapping the browser's built-in
// IndexedDB). This is the local-first store: every read and write in the app
// goes here first, instantly, with no network. Each row also carries two sync
// columns used later (Phase 2) to back up to Turso:
//   updatedAt — when the row last changed (for last-edit-wins reconciliation)
//   deletedAt — a "tombstone"; deletes are soft so they can propagate to the
//               cloud instead of a row silently reappearing on the next sync.
import Dexie, { type Table } from "dexie";
import {
  DEFAULT_ANTIBIOTIC_CONSUMABLE_NAME,
  DEFAULT_ANTIBIOTIC_MG_PER_LITER,
  DEFAULT_CONSUMABLES,
  DEFAULT_PDA_CONSUMABLE_NAME,
  DEFAULT_PDA_GRAMS_PER_LITER,
  DEFAULT_SPECIES,
  DEFAULT_STERILIZATION_METHODS,
  DEFAULT_ZONES,
  SETTING_KEYS,
} from "../defaults";

// Dates are stored as ISO strings (not Date objects): they sort chronologically
// as plain text, survive IndexedDB round-trips cleanly, and match the shape the
// UI components already expect as props.

export interface BatchRecord {
  id: string;
  species: string;
  quantity: number;
  pdaBatchRef: string | null;
  sterilizationMethod: string;
  inoculationDate: string; // ISO
  zone: string;
  outcome: string;
  notes: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  deletedAt: string | null; // ISO tombstone, or null when live
}

export interface ConsumableRecord {
  id: string;
  name: string;
  unit: string;
  stock: number;
  threshold: number;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SettingRecord {
  key: string;
  value: string;
  updatedAt: string;
}

export interface MediaPrepRecord {
  id: string;
  volumeMl: number;
  pdaGrams: number;
  antibioticMg: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function newId(): string {
  // Globally unique, so two devices creating rows offline never collide.
  return crypto.randomUUID();
}

class MycoLabDB extends Dexie {
  batches!: Table<BatchRecord, string>;
  consumables!: Table<ConsumableRecord, string>;
  settings!: Table<SettingRecord, string>;
  mediaPreps!: Table<MediaPrepRecord, string>;

  constructor() {
    super("mycolab");
    // The listed fields are the indexed ones (queryable / sortable). "&name"
    // marks name as unique. Other fields are still stored, just not indexed.
    this.version(1).stores({
      batches: "id, outcome, inoculationDate, createdAt, updatedAt, deletedAt",
      consumables: "id, &name, updatedAt, deletedAt",
      settings: "key, updatedAt",
      mediaPreps: "id, createdAt, updatedAt, deletedAt",
    });
    // Runs once, the first time the database is created on this device.
    this.on("populate", () => seed(this));
  }
}

// Lazily construct the DB so nothing touches IndexedDB during server-side
// rendering (IndexedDB only exists in the browser). The first real query,
// which only ever runs client-side, creates it.
let instance: MycoLabDB | null = null;
export function db(): MycoLabDB {
  if (!instance) instance = new MycoLabDB();
  return instance;
}

// Seeds defaults on first run so the app isn't empty — mirrors prisma/seed.ts.
async function seed(d: MycoLabDB): Promise<void> {
  const ts = nowISO();

  const settings: Record<string, string> = {
    [SETTING_KEYS.pdaGramsPerLiter]: String(DEFAULT_PDA_GRAMS_PER_LITER),
    [SETTING_KEYS.antibioticMgPerLiter]: String(DEFAULT_ANTIBIOTIC_MG_PER_LITER),
    [SETTING_KEYS.pdaConsumableName]: DEFAULT_PDA_CONSUMABLE_NAME,
    [SETTING_KEYS.antibioticConsumableName]: DEFAULT_ANTIBIOTIC_CONSUMABLE_NAME,
    [SETTING_KEYS.species]: JSON.stringify(DEFAULT_SPECIES),
    [SETTING_KEYS.sterilizationMethods]: JSON.stringify(
      DEFAULT_STERILIZATION_METHODS,
    ),
    [SETTING_KEYS.zones]: JSON.stringify(DEFAULT_ZONES),
  };
  await d.settings.bulkAdd(
    Object.entries(settings).map(([key, value]) => ({ key, value, updatedAt: ts })),
  );

  await d.consumables.bulkAdd(
    DEFAULT_CONSUMABLES.map((c) => ({
      id: newId(),
      name: c.name,
      unit: c.unit,
      stock: c.stock,
      threshold: c.threshold,
      updatedAt: ts,
      deletedAt: null,
    })),
  );

  // A few example batches so the screens aren't blank on first launch.
  const today = new Date();
  const mmdd = `${String(today.getMonth() + 1).padStart(2, "0")}${String(
    today.getDate(),
  ).padStart(2, "0")}`;
  const daysAgoISO = (daysAgo: number): string => {
    const x = new Date(today);
    x.setDate(x.getDate() - daysAgo);
    return x.toISOString();
  };

  await d.batches.bulkAdd([
    {
      id: `AUR-${mmdd}-01`,
      species: "Auricularia sp.",
      quantity: 200,
      pdaBatchRef: "PDA-06",
      sterilizationMethod: "Pressure cooker",
      inoculationDate: daysAgoISO(1),
      zone: "Incubation",
      outcome: "CLEAN",
      notes: "First run of the cycle.",
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
    },
    {
      id: `PLE-${mmdd}-01`,
      species: "Pleurotus sp.",
      quantity: 150,
      pdaBatchRef: "PDA-06",
      sterilizationMethod: "Autoclave",
      inoculationDate: daysAgoISO(5),
      zone: "Incubation",
      outcome: "CONTAMINATED",
      notes: "Two bags showed green mold at day 4.",
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
    },
    {
      id: `PLE-${mmdd}-02`,
      species: "Pleurotus sp.",
      quantity: 180,
      pdaBatchRef: "PDA-05",
      sterilizationMethod: "Pressure cooker",
      inoculationDate: daysAgoISO(12),
      zone: "Fruiting tent",
      outcome: "FRUITED",
      notes: null,
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
    },
  ]);
}
