// Pure SQL builders for the remote (Turso/libSQL) side of sync. No client, no
// browser APIs — just strings — so this can be unit-tested against a plain
// SQLite/libSQL engine.
import type { SyncTable } from "./tables";

// Parameterized upsert with last-edit-wins baked into SQL: on a primary-key
// conflict, the existing row is overwritten ONLY when the incoming row is newer
// (excluded.updatedAt > current.updatedAt). Older or equal incoming rows are a
// no-op, so a stale device can never clobber a fresher cloud record.
export function upsertSql(t: SyncTable): string {
  const cols = t.columns;
  const placeholders = cols.map(() => "?").join(", ");
  const assignments = cols
    .filter((c) => c !== t.pk)
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");
  return (
    `INSERT INTO ${t.store} (${cols.join(", ")}) VALUES (${placeholders}) ` +
    `ON CONFLICT(${t.pk}) DO UPDATE SET ${assignments} ` +
    `WHERE excluded.updatedAt > ${t.store}.updatedAt`
  );
}

// Rows changed since a watermark (an ISO timestamp, or "" to fetch everything).
// Ordered oldest-first so the caller can advance its cursor safely.
export function selectSinceSql(t: SyncTable): string {
  return `SELECT ${t.columns.join(", ")} FROM ${t.store} WHERE updatedAt > ? ORDER BY updatedAt ASC`;
}
