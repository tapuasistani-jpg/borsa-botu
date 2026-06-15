import type { SignalRecord, SignalRecordStatus } from "@/lib/signal-history";
import { getDb } from "./client";

const MAX_RECORDS = 50;

function rowToRecord(row: Record<string, unknown>): SignalRecord {
  return {
    id: String(row.id),
    symbol: String(row.symbol),
    signalEn: String(row.signal_en),
    signalTr: row.signal_tr ? String(row.signal_tr) : undefined,
    entryPrice: Number(row.entry_price),
    timestamp: Number(row.timestamp),
    status: String(row.status) as SignalRecordStatus,
    exitPrice: row.exit_price != null ? Number(row.exit_price) : undefined,
    evaluatedAt:
      row.evaluated_at != null ? Number(row.evaluated_at) : undefined,
    reason: row.reason ? String(row.reason) : undefined,
    taSummary: row.ta_summary ? String(row.ta_summary) : undefined,
    technicalReason: row.technical_reason
      ? String(row.technical_reason)
      : undefined,
  };
}

export async function loadSignalRecords(): Promise<SignalRecord[]> {
  const db = await getDb();
  const result = await db.execute(
    "SELECT * FROM signal_records ORDER BY timestamp ASC"
  );
  return result.rows.map((row) =>
    rowToRecord(row as unknown as Record<string, unknown>)
  );
}

export async function saveSignalRecords(records: SignalRecord[]): Promise<void> {
  const db = await getDb();
  const trimmed = records.slice(-MAX_RECORDS);

  await db.execute("DELETE FROM signal_records");

  for (const record of trimmed) {
    await db.execute({
      sql: `INSERT INTO signal_records (
        id, symbol, signal_en, signal_tr, entry_price, timestamp, status,
        exit_price, evaluated_at, reason, ta_summary, technical_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        record.id,
        record.symbol,
        record.signalEn,
        record.signalTr ?? null,
        record.entryPrice,
        record.timestamp,
        record.status,
        record.exitPrice ?? null,
        record.evaluatedAt ?? null,
        record.reason ?? null,
        record.taSummary ?? null,
        record.technicalReason ?? null,
      ],
    });
  }
}

export async function loadSignalTrackState(): Promise<Record<string, string>> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT value FROM kv_store WHERE key = ?",
    args: ["signal:track_state"],
  });
  const raw = result.rows[0]?.value;
  if (typeof raw !== "string") return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function saveSignalTrackState(
  state: Record<string, string>
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO kv_store (key, value, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [
      "signal:track_state",
      JSON.stringify(state),
      new Date().toISOString(),
    ],
  });
}
