import { getDb } from "./client";

export interface PaperAccount {
  cash: number;
  initialCash: number;
  enabled: boolean;
}

export interface PaperPosition {
  symbol: string;
  quantity: number;
  avgPrice: number;
}

export interface PaperTrade {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  total: number;
  commission: number;
  signalEn?: string;
  signalTr?: string;
  reason?: string;
  createdAt: string;
}

export async function loadPaperAccount(): Promise<PaperAccount | null> {
  const db = await getDb();
  const result = await db.execute(
    "SELECT cash, initial_cash, enabled FROM paper_account WHERE id = 'default'"
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    cash: Number(row.cash),
    initialCash: Number(row.initial_cash),
    enabled: Number(row.enabled) === 1,
  };
}

export async function savePaperAccount(account: PaperAccount): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO paper_account (id, cash, initial_cash, enabled, updated_at)
          VALUES ('default', ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            cash = excluded.cash,
            initial_cash = excluded.initial_cash,
            enabled = excluded.enabled,
            updated_at = excluded.updated_at`,
    args: [
      account.cash,
      account.initialCash,
      account.enabled ? 1 : 0,
      now,
    ],
  });
}

export async function loadPaperPositions(): Promise<PaperPosition[]> {
  const db = await getDb();
  const result = await db.execute(
    "SELECT symbol, quantity, avg_price FROM paper_positions ORDER BY symbol ASC"
  );
  return result.rows.map((row) => ({
    symbol: String(row.symbol),
    quantity: Number(row.quantity),
    avgPrice: Number(row.avg_price),
  }));
}

export async function savePaperPositions(
  positions: PaperPosition[]
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.execute("DELETE FROM paper_positions");
  for (const pos of positions) {
    await db.execute({
      sql: `INSERT INTO paper_positions (symbol, quantity, avg_price, updated_at)
            VALUES (?, ?, ?, ?)`,
      args: [pos.symbol, pos.quantity, pos.avgPrice, now],
    });
  }
}

export async function insertPaperTrade(trade: PaperTrade): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO paper_trades (
      id, symbol, side, quantity, price, total, commission,
      signal_en, signal_tr, reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      trade.id,
      trade.symbol,
      trade.side,
      trade.quantity,
      trade.price,
      trade.total,
      trade.commission,
      trade.signalEn ?? null,
      trade.signalTr ?? null,
      trade.reason ?? null,
      trade.createdAt,
    ],
  });
}

export async function loadPaperTrades(limit = 30): Promise<PaperTrade[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT * FROM paper_trades ORDER BY created_at DESC LIMIT ?`,
    args: [limit],
  });
  return result.rows.map((row) => ({
    id: String(row.id),
    symbol: String(row.symbol),
    side: String(row.side) as PaperTrade["side"],
    quantity: Number(row.quantity),
    price: Number(row.price),
    total: Number(row.total),
    commission: Number(row.commission),
    signalEn: row.signal_en ? String(row.signal_en) : undefined,
    signalTr: row.signal_tr ? String(row.signal_tr) : undefined,
    reason: row.reason ? String(row.reason) : undefined,
    createdAt: String(row.created_at),
  }));
}

export async function resetPaperTables(
  initialCash: number
): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM paper_trades");
  await db.execute("DELETE FROM paper_positions");
  await db.execute("DELETE FROM paper_account");
  await savePaperAccount({
    cash: initialCash,
    initialCash,
    enabled: true,
  });
}
