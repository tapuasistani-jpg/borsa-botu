import { createClient, type Client } from "@libsql/client";
import fs from "fs";
import path from "path";
import { initSchema } from "./schema";

let client: Client | null = null;
let schemaReady: Promise<void> | null = null;

export type DbMode = "turso" | "local" | "serverless";

export function getDbMode(): DbMode {
  if (process.env.TURSO_DATABASE_URL?.trim()) return "turso";
  if (process.env.NODE_ENV !== "production") return "local";
  return "serverless";
}

function resolveDbUrl(): string {
  const turso = process.env.TURSO_DATABASE_URL?.trim();
  if (turso) return turso;

  if (process.env.NODE_ENV !== "production") {
    const dir = path.join(process.cwd(), ".data");
    fs.mkdirSync(dir, { recursive: true });
    return `file:${path.join(dir, "borsa.db")}`;
  }

  return "file:/tmp/borsa_botu.db";
}

export async function getDb(): Promise<Client> {
  if (!client) {
    client = createClient({
      url: resolveDbUrl(),
      authToken: process.env.TURSO_AUTH_TOKEN?.trim(),
    });
  }

  if (!schemaReady) {
    schemaReady = initSchema(client);
  }
  await schemaReady;
  return client;
}

export function isTursoConfigured(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL?.trim());
}
