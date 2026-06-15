import {
  COMMISSION_RATE,
  isPaperTradingEnabled,
  PAPER_INITIAL_CASH,
  PAPER_RISKY_TRADE_SIZE_TL,
  PAPER_TRADE_SIZE_TL,
} from "./trading-config";
import {
  insertPaperTrade,
  loadPaperAccount,
  loadPaperPositions,
  loadPaperTrades,
  resetPaperTables,
  savePaperAccount,
  savePaperPositions,
  type PaperPosition,
  type PaperTrade,
} from "./db/paper-db";

const BUY_SIGNALS = new Set(["STRONG BUY", "BUY", "RISKY BUY"]);
const SELL_SIGNALS = new Set(["STRONG SELL", "SELL"]);

export interface PaperSnapshot {
  account: {
    cash: number;
    initialCash: number;
    enabled: boolean;
  };
  positions: PaperPosition[];
  trades: PaperTrade[];
  totals: {
    positionsValue: number;
    equity: number;
    pnlTl: number;
    pnlPercent: number;
  };
}

function tradeSizeForSignal(signalEn: string): number {
  if (signalEn === "RISKY BUY") return PAPER_RISKY_TRADE_SIZE_TL;
  return PAPER_TRADE_SIZE_TL;
}

async function ensureAccount() {
  let account = await loadPaperAccount();
  if (!account) {
    account = {
      cash: PAPER_INITIAL_CASH,
      initialCash: PAPER_INITIAL_CASH,
      enabled: true,
    };
    await savePaperAccount(account);
  }
  return account;
}

function calcTotals(
  account: { cash: number; initialCash: number },
  positions: PaperPosition[],
  prices: { symbol: string; price: number | null }[]
) {
  let positionsValue = 0;
  for (const pos of positions) {
    const live = prices.find((p) => p.symbol === pos.symbol)?.price;
    if (typeof live === "number") {
      positionsValue += pos.quantity * live;
    } else {
      positionsValue += pos.quantity * pos.avgPrice;
    }
  }
  const equity = account.cash + positionsValue;
  const pnlTl = equity - account.initialCash;
  const pnlPercent =
    account.initialCash > 0 ? (pnlTl / account.initialCash) * 100 : 0;
  return { positionsValue, equity, pnlTl, pnlPercent };
}

export async function getPaperSnapshot(
  prices: { symbol: string; price: number | null }[] = []
): Promise<PaperSnapshot> {
  const account = await ensureAccount();
  const positions = await loadPaperPositions();
  const trades = await loadPaperTrades(25);
  const totals = calcTotals(account, positions, prices);
  return { account, positions, trades, totals };
}

export async function setPaperEnabled(enabled: boolean): Promise<void> {
  const account = await ensureAccount();
  account.enabled = enabled;
  await savePaperAccount(account);
}

export async function resetPaperAccount(): Promise<PaperSnapshot> {
  await resetPaperTables(PAPER_INITIAL_CASH);
  return getPaperSnapshot();
}

export interface PaperSignalEvent {
  symbol: string;
  signalEn: string;
  signalTr?: string;
  price: number;
  previousSignal?: string;
  reason?: string;
}

/** Sinyal degisince sanal islem uygula */
export async function applyPaperTrade(
  event: PaperSignalEvent
): Promise<PaperTrade | null> {
  if (!isPaperTradingEnabled()) return null;

  const account = await ensureAccount();
  if (!account.enabled) return null;

  const { symbol, signalEn, signalTr, price, previousSignal, reason } = event;
  if (!Number.isFinite(price) || price <= 0) return null;

  const positions = await loadPaperPositions();
  const posIdx = positions.findIndex((p) => p.symbol === symbol);
  const hasPosition = posIdx >= 0;

  if (SELL_SIGNALS.has(signalEn) && hasPosition) {
    const pos = positions[posIdx];
    const gross = pos.quantity * price;
    const commission = gross * COMMISSION_RATE;
    const net = gross - commission;
    account.cash += net;

    const trade: PaperTrade = {
      id: `pt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      symbol,
      side: "SELL",
      quantity: pos.quantity,
      price,
      total: gross,
      commission,
      signalEn,
      signalTr,
      reason,
      createdAt: new Date().toISOString(),
    };

    positions.splice(posIdx, 1);
    await savePaperAccount(account);
    await savePaperPositions(positions);
    await insertPaperTrade(trade);
    return trade;
  }

  if (!BUY_SIGNALS.has(signalEn) || hasPosition) return null;
  if (previousSignal && BUY_SIGNALS.has(previousSignal)) return null;

  const budget = Math.min(tradeSizeForSignal(signalEn), account.cash * 0.95);
  if (budget < price) return null;

  const commission = budget * COMMISSION_RATE;
  const netSpend = budget - commission;
  const quantity = Math.floor(netSpend / price);
  if (quantity <= 0) return null;

  const totalCost = quantity * price + commission;
  account.cash -= totalCost;

  positions.push({ symbol, quantity, avgPrice: price });

  const trade: PaperTrade = {
    id: `pt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    symbol,
    side: "BUY",
    quantity,
    price,
    total: quantity * price,
    commission,
    signalEn,
    signalTr,
    reason,
    createdAt: new Date().toISOString(),
  };

  await savePaperAccount(account);
  await savePaperPositions(positions);
  await insertPaperTrade(trade);
  return trade;
}

export async function applyPaperTradesFromSync(
  events: PaperSignalEvent[]
): Promise<PaperTrade[]> {
  const executed: PaperTrade[] = [];
  for (const event of events) {
    const trade = await applyPaperTrade(event);
    if (trade) executed.push(trade);
  }
  return executed;
}
