import type { PortfolioItem } from "@/lib/portfolio";
import { sanitizePortfolio } from "@/lib/portfolio";
import { getDb } from "./client";

export async function loadPortfolioFromDb(): Promise<PortfolioItem[]> {
  const db = await getDb();
  const result = await db.execute(
    "SELECT id, symbol, quantity, buy_price FROM portfolio_items ORDER BY created_at ASC"
  );

  const raw = result.rows.map((row) => ({
    id: String(row.id),
    symbol: String(row.symbol),
    quantity: Number(row.quantity),
    buyPrice: Number(row.buy_price),
  }));

  return sanitizePortfolio(raw);
}

export async function savePortfolioToDb(items: PortfolioItem[]): Promise<void> {
  const db = await getDb();
  const clean = sanitizePortfolio(items);
  const now = new Date().toISOString();

  await db.execute("DELETE FROM portfolio_items");

  for (const item of clean) {
    await db.execute({
      sql: `INSERT INTO portfolio_items (id, symbol, quantity, buy_price, created_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [item.id, item.symbol, item.quantity, item.buyPrice, now],
    });
  }
}
