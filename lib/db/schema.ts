import type { Client } from "@libsql/client";

export async function initSchema(db: Client): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS portfolio_items (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      quantity REAL NOT NULL,
      buy_price REAL NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS signal_records (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      signal_en TEXT NOT NULL,
      signal_tr TEXT,
      entry_price REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      status TEXT NOT NULL,
      exit_price REAL,
      evaluated_at INTEGER,
      reason TEXT,
      ta_summary TEXT,
      technical_reason TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS trade_journal (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      quantity REAL NOT NULL,
      entry_price REAL NOT NULL,
      stop_loss REAL,
      take_profit REAL,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      exit_price REAL,
      closed_at TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_signal_ts ON signal_records(timestamp DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_journal_created ON trade_journal(created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS paper_account (
      id TEXT PRIMARY KEY DEFAULT 'default',
      cash REAL NOT NULL,
      initial_cash REAL NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS paper_positions (
      symbol TEXT PRIMARY KEY,
      quantity REAL NOT NULL,
      avg_price REAL NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS paper_trades (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      total REAL NOT NULL,
      commission REAL NOT NULL,
      signal_en TEXT,
      signal_tr TEXT,
      reason TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_paper_trades_created ON paper_trades(created_at DESC)`,
  ];

  for (const sql of statements) {
    await db.execute(sql);
  }
}
