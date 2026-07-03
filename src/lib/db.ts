import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

// Builds a PrismaClient. In production (Vercel) TURSO_DATABASE_URL is set, so we
// connect to Turso over libSQL. Locally those vars are unset, so we fall back to
// the plain SQLite file (prisma/dev.db) — keeping `prisma migrate dev` and local
// dev working exactly as before.
export function createPrismaClient(): PrismaClient {
  const url = process.env.TURSO_DATABASE_URL;
  const log =
    process.env.NODE_ENV === "development"
      ? (["error", "warn"] as const)
      : (["error"] as const);

  if (url) {
    const libsql = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter, log: [...log] });
  }

  return new PrismaClient({ log: [...log] });
}

// Reuse a single client across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
