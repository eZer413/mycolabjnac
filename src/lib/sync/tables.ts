// Describes each table that participates in cloud sync. One source of truth for
// both the on-device (Dexie) side and the remote (Turso/libSQL) side, so the two
// can never drift apart. Every synced table carries an `updatedAt` (ISO string,
// used for last-edit-wins) and — except settings — a `deletedAt` tombstone.

export type SyncTable = {
  store: string; // Dexie store name AND remote table name (kept identical)
  pk: "id" | "key"; // primary key column
  columns: string[]; // all columns, in a stable order (pk first)
  // CREATE TABLE for the remote side. IF NOT EXISTS keeps it idempotent.
  ddl: string;
};

export const SYNC_TABLES: SyncTable[] = [
  {
    store: "batches",
    pk: "id",
    columns: [
      "id",
      "species",
      "quantity",
      "pdaBatchRef",
      "sterilizationMethod",
      "inoculationDate",
      "zone",
      "outcome",
      "notes",
      "createdAt",
      "updatedAt",
      "deletedAt",
    ],
    ddl: `CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      species TEXT,
      quantity INTEGER,
      pdaBatchRef TEXT,
      sterilizationMethod TEXT,
      inoculationDate TEXT,
      zone TEXT,
      outcome TEXT,
      notes TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT
    )`,
  },
  {
    store: "consumables",
    pk: "id",
    columns: [
      "id",
      "name",
      "unit",
      "stock",
      "threshold",
      "updatedAt",
      "deletedAt",
    ],
    ddl: `CREATE TABLE IF NOT EXISTS consumables (
      id TEXT PRIMARY KEY,
      name TEXT,
      unit TEXT,
      stock REAL,
      threshold REAL,
      updatedAt TEXT,
      deletedAt TEXT
    )`,
  },
  {
    store: "settings",
    pk: "key",
    columns: ["key", "value", "updatedAt"],
    ddl: `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updatedAt TEXT
    )`,
  },
  {
    store: "mediaPreps",
    pk: "id",
    columns: [
      "id",
      "volumeMl",
      "pdaGrams",
      "antibioticMg",
      "createdAt",
      "updatedAt",
      "deletedAt",
    ],
    ddl: `CREATE TABLE IF NOT EXISTS mediaPreps (
      id TEXT PRIMARY KEY,
      volumeMl REAL,
      pdaGrams REAL,
      antibioticMg REAL,
      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT
    )`,
  },
];
