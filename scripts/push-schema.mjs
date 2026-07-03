// Applies the committed Prisma migration SQL to a Turso database over the network,
// so you don't need the Turso CLI. Reads every prisma/migrations/*/migration.sql
// in order and runs it against TURSO_DATABASE_URL / TURSO_AUTH_TOKEN.
//
// Usage (PowerShell):
//   $env:TURSO_DATABASE_URL="libsql://..."; $env:TURSO_AUTH_TOKEN="..."; npm run db:push:turso
import { createClient } from "@libsql/client";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error(
    "Missing TURSO_DATABASE_URL. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN first.",
  );
  process.exit(1);
}

const client = createClient({ url, authToken });
const migrationsDir = "prisma/migrations";

const dirs = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort(); // timestamp-prefixed names sort chronologically

if (dirs.length === 0) {
  console.error("No migrations found under prisma/migrations.");
  process.exit(1);
}

for (const dir of dirs) {
  const file = join(migrationsDir, dir, "migration.sql");
  const sql = readFileSync(file, "utf8");
  process.stdout.write(`Applying ${dir} ... `);
  await client.executeMultiple(sql);
  console.log("ok");
}

console.log("Schema pushed to Turso. Next: run `npm run db:seed`.");
