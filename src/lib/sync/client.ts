// Lazily creates the libSQL client that talks to Turso directly from the device
// over HTTPS. Returns null when no credentials are configured, so the rest of
// the app runs offline-only without errors.
//
// The credentials are NEXT_PUBLIC_* because this code runs in the browser / the
// Android WebView, so they are baked into the client bundle. That exposes the
// token to anyone with the app files — acceptable for a personal debug APK; for
// a shared or public build, front Turso with a small proxy instead.
import type { Client } from "@libsql/client/web";

let clientPromise: Promise<Client | null> | null = null;

export function getTursoClient(): Promise<Client | null> {
  if (!clientPromise) clientPromise = create();
  return clientPromise;
}

export function isSyncConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TURSO_DATABASE_URL);
}

async function create(): Promise<Client | null> {
  const url = process.env.NEXT_PUBLIC_TURSO_DATABASE_URL;
  const authToken = process.env.NEXT_PUBLIC_TURSO_AUTH_TOKEN;
  if (!url) return null;

  // Dynamic import keeps the libSQL web client out of any server-side render
  // pass; it only ever loads in the browser when sync actually runs.
  const { createClient } = await import("@libsql/client/web");
  return createClient({ url, authToken });
}
