export type JournalSide = "BUY" | "SELL";
export type JournalStatus = "OPEN" | "CLOSED";

export interface TradeJournalEntry {
  id: string;
  symbol: string;
  side: JournalSide;
  quantity: number;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  note?: string;
  status: JournalStatus;
  exitPrice?: number;
  closedAt?: string;
  createdAt: string;
}

export interface TradeJournalInput {
  symbol: string;
  side: JournalSide;
  quantity: number;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  note?: string;
}

export function calcJournalPnL(
  entry: TradeJournalEntry,
  livePrice: number | null
): { pnlTl: number | null; pnlPercent: number | null } {
  const price =
    entry.status === "CLOSED" && entry.exitPrice != null
      ? entry.exitPrice
      : livePrice;

  if (price == null) return { pnlTl: null, pnlPercent: null };

  const cost = entry.quantity * entry.entryPrice;
  const value = entry.quantity * price;
  const rawPnl = entry.side === "BUY" ? value - cost : cost - value;
  const pnlPercent = cost > 0 ? (rawPnl / cost) * 100 : null;

  return { pnlTl: rawPnl, pnlPercent };
}

export function newJournalId(): string {
  return `j_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
