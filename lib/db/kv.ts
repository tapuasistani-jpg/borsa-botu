import { getDb } from "./client";

export async function getJsonKv<T>(key: string, fallback: T): Promise<T> {
  try {
    const db = await getDb();
    const row = await db.execute({
      sql: "SELECT value FROM kv_store WHERE key = ?",
      args: [key],
    });
    const raw = row.rows[0]?.value;
    if (typeof raw !== "string") return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function setJsonKv(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO kv_store (key, value, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [key, JSON.stringify(value), new Date().toISOString()],
  });
}
