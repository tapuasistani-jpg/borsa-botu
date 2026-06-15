import {
  calcJournalPnL,
  newJournalId,
  type TradeJournalEntry,
  type TradeJournalInput,
} from "@/lib/trade-journal";
import { getDb } from "./client";

export type { TradeJournalEntry, TradeJournalInput, JournalSide, JournalStatus } from "@/lib/trade-journal";
export { calcJournalPnL };

function rowToEntry(row: Record<string, unknown>): TradeJournalEntry {
  return {
    id: String(row.id),
    symbol: String(row.symbol),
    side: String(row.side) as TradeJournalEntry["side"],
    quantity: Number(row.quantity),
    entryPrice: Number(row.entry_price),
    stopLoss: row.stop_loss != null ? Number(row.stop_loss) : undefined,
    takeProfit: row.take_profit != null ? Number(row.take_profit) : undefined,
    note: row.note ? String(row.note) : undefined,
    status: String(row.status) as TradeJournalEntry["status"],
    exitPrice: row.exit_price != null ? Number(row.exit_price) : undefined,
    closedAt: row.closed_at ? String(row.closed_at) : undefined,
    createdAt: String(row.created_at),
  };
}

export async function listJournalEntries(
  limit = 50
): Promise<TradeJournalEntry[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM trade_journal ORDER BY created_at DESC LIMIT ?",
    args: [limit],
  });
  return result.rows.map((row) =>
    rowToEntry(row as unknown as Record<string, unknown>)
  );
}

export async function addJournalEntry(
  input: TradeJournalInput
): Promise<TradeJournalEntry> {
  const db = await getDb();
  const entry: TradeJournalEntry = {
    id: newJournalId(),
    symbol: input.symbol.toUpperCase(),
    side: input.side,
    quantity: input.quantity,
    entryPrice: input.entryPrice,
    stopLoss: input.stopLoss,
    takeProfit: input.takeProfit,
    note: input.note?.trim() || undefined,
    status: "OPEN",
    createdAt: new Date().toISOString(),
  };

  await db.execute({
    sql: `INSERT INTO trade_journal (
      id, symbol, side, quantity, entry_price, stop_loss, take_profit, note, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      entry.id,
      entry.symbol,
      entry.side,
      entry.quantity,
      entry.entryPrice,
      entry.stopLoss ?? null,
      entry.takeProfit ?? null,
      entry.note ?? null,
      entry.status,
      entry.createdAt,
    ],
  });

  return entry;
}

export async function closeJournalEntry(
  id: string,
  exitPrice: number
): Promise<TradeJournalEntry | null> {
  const db = await getDb();
  const closedAt = new Date().toISOString();

  await db.execute({
    sql: `UPDATE trade_journal
          SET status = 'CLOSED', exit_price = ?, closed_at = ?
          WHERE id = ? AND status = 'OPEN'`,
    args: [exitPrice, closedAt, id],
  });

  const result = await db.execute({
    sql: "SELECT * FROM trade_journal WHERE id = ?",
    args: [id],
  });

  const row = result.rows[0];
  if (!row) return null;
  return rowToEntry(row as unknown as Record<string, unknown>);
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "DELETE FROM trade_journal WHERE id = ?",
    args: [id],
  });
}
