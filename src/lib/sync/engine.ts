// The sync engine. Runs entirely on the device: pulls newer rows down from
// Turso into the local Dexie database, then pushes local changes up — both using
// last-edit-wins on the `updatedAt` timestamp, with soft-deleted `deletedAt`
// tombstones so deletions propagate instead of resurrecting.
//
// Note on conflicts: last-edit-wins compares wall-clock timestamps across
// devices. For a single operator that is plenty; if two devices edit the very
// same record within clock-skew of each other while both offline, the later
// timestamp wins and the other edit is dropped. No data is corrupted.
import type { Client, InValue } from "@libsql/client/web";
import { db } from "../local/db";
import { getTursoClient } from "./client";
import { selectSinceSql, upsertSql } from "./remote-sql";
import { SYNC_TABLES, type SyncTable } from "./tables";

export type SyncResult = { pulled: number; pushed: number };

// ---- Sync bookkeeping (local-only) ----

export async function getMeta(key: string): Promise<string | undefined> {
  const row = await db().syncMeta.get(key);
  return row?.value;
}

async function setMeta(key: string, value: string): Promise<void> {
  await db().syncMeta.put({ key, value });
}

// ---- Remote schema ----

async function ensureRemoteSchema(client: Client): Promise<void> {
  for (const t of SYNC_TABLES) {
    await client.execute(t.ddl);
  }
}

// ---- Row mapping ----

// Turns a libSQL result row into a plain record keyed by column name. libSQL
// rows are index-accessible but also expose named columns; NULLs come back as
// null, which is exactly what the local records use.
function rowToRecord(t: SyncTable, row: Record<string, unknown>): Record<string, unknown> {
  const rec: Record<string, unknown> = {};
  for (const c of t.columns) rec[c] = row[c] ?? null;
  return rec;
}

// ---- Pull: cloud -> device ----

async function pullTable(client: Client, t: SyncTable): Promise<number> {
  const cursor = (await getMeta(`pull:${t.store}`)) ?? "";
  const rs = await client.execute({ sql: selectSinceSql(t), args: [cursor] });

  let applied = 0;
  let maxUpdated = cursor;
  const table = db().table(t.store);

  await db().transaction("rw", table, async () => {
    for (const raw of rs.rows) {
      const rec = rowToRecord(t, raw as unknown as Record<string, unknown>);
      const updatedAt = String(rec.updatedAt ?? "");
      const pkVal = rec[t.pk] as string;

      // Natural-key collision: the same logical row (e.g. a consumable with the
      // same unique `name`) exists locally under a DIFFERENT id — typically
      // because both devices seeded it independently. Converge onto the incoming
      // id so the unique index never rejects the write, keeping whichever side's
      // data is newer.
      if (t.uniqueBy) {
        const twin = (await table
          .where(t.uniqueBy)
          .equals(rec[t.uniqueBy] as string)
          .first()) as (Record<string, unknown> & { updatedAt?: string }) | undefined;
        if (twin && twin[t.pk] !== pkVal) {
          await table.delete(twin[t.pk] as string);
          if (String(twin.updatedAt ?? "") > updatedAt) {
            // Local edit is newer — keep its data, but under the incoming id.
            await table.put({ ...twin, [t.pk]: pkVal });
            applied += 1;
            if (updatedAt > maxUpdated) maxUpdated = updatedAt;
            continue;
          }
        }
      }

      const local = (await table.get(pkVal)) as { updatedAt?: string } | undefined;
      // Last-edit-wins: apply only if we have no local copy or the remote is
      // strictly newer. Equal timestamps mean it is a row we just pushed.
      if (!local || updatedAt > (local.updatedAt ?? "")) {
        await table.put(rec);
        applied += 1;
      }
      if (updatedAt > maxUpdated) maxUpdated = updatedAt;
    }
  });

  if (maxUpdated !== cursor) await setMeta(`pull:${t.store}`, maxUpdated);
  return applied;
}

// ---- Push: device -> cloud ----

async function pushTable(client: Client, t: SyncTable): Promise<number> {
  const cursor = (await getMeta(`push:${t.store}`)) ?? "";
  const rows = (await db().table(t.store).toArray()) as Array<
    Record<string, unknown>
  >;
  const pending = rows
    .filter((r) => String(r.updatedAt ?? "") > cursor)
    .sort((a, b) => String(a.updatedAt).localeCompare(String(b.updatedAt)));
  if (pending.length === 0) return 0;

  const sql = upsertSql(t);
  const statements = pending.map((r) => ({
    sql,
    args: t.columns.map((c) => (r[c] ?? null) as InValue),
  }));
  // One atomic write batch — either the whole push lands or none of it does.
  await client.batch(statements, "write");

  const maxUpdated = String(pending[pending.length - 1].updatedAt);
  await setMeta(`push:${t.store}`, maxUpdated);
  return pending.length;
}

// ---- Orchestration ----

let inFlight: Promise<SyncResult> | null = null;

export async function syncNow(): Promise<SyncResult> {
  // Collapse overlapping calls (interval tick landing on top of an online event)
  // so we never run two syncs at once.
  if (inFlight) return inFlight;
  inFlight = run();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

async function run(): Promise<SyncResult> {
  const client = await getTursoClient();
  if (!client) throw new Error("Cloud sync is not configured.");

  await ensureRemoteSchema(client);

  let pulled = 0;
  let pushed = 0;
  for (const t of SYNC_TABLES) {
    pulled += await pullTable(client, t);
    pushed += await pushTable(client, t);
  }
  await setMeta("lastSyncedAt", new Date().toISOString());
  return { pulled, pushed };
}

// Number of local rows not yet confirmed pushed — drives the "N pending" badge.
export async function countPending(): Promise<number> {
  let n = 0;
  for (const t of SYNC_TABLES) {
    const cursor = (await getMeta(`push:${t.store}`)) ?? "";
    const rows = (await db().table(t.store).toArray()) as Array<{
      updatedAt?: string;
    }>;
    n += rows.filter((r) => (r.updatedAt ?? "") > cursor).length;
  }
  return n;
}
