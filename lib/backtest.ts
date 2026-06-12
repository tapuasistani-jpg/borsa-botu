import type { OhlcCandle } from "./indicators";
import { analyzeStock } from "./indicators";
import type { SignalType, StockAnalysis } from "./stocks";

export interface BacktestTrade {
  type: "BUY" | "SELL";
  dayIndex: number;
  price: number;
  signal: SignalType;
}

export interface BacktestResult {
  symbol: string;
  periodDays: number;
  totalTrades: number;
  winningTrades: number;
  winRate: number;
  strategyReturnPercent: number;
  buyHoldReturnPercent: number;
  strongBuyCount: number;
  strongSellCount: number;
  strongBuySuccessRate: number;
  strongSellSuccessRate: number;
  trades: BacktestTrade[];
  summary: string;
}

const MIN_CANDLES = 50;
const FORWARD_DAYS = 5;

function getSignal(candles: OhlcCandle[], endIdx: number): StockAnalysis | null {
  const slice = candles.slice(0, endIdx + 1);
  if (slice.length < MIN_CANDLES) return null;
  return analyzeStock("", slice);
}

function forwardReturn(candles: OhlcCandle[], fromIdx: number, days: number): number | null {
  const toIdx = fromIdx + days;
  if (toIdx >= candles.length) return null;
  const from = candles[fromIdx].close;
  const to = candles[toIdx].close;
  if (from <= 0) return null;
  return ((to - from) / from) * 100;
}

export function runBacktest(symbol: string, candles: OhlcCandle[]): BacktestResult | null {
  if (candles.length < MIN_CANDLES + 10) return null;

  const sixMonthStart = Math.max(MIN_CANDLES, candles.length - 126);
  const trades: BacktestTrade[] = [];

  let inPosition = false;
  let entryPrice = 0;
  let winningTrades = 0;
  let totalTrades = 0;

  let strongBuyCount = 0;
  let strongSellCount = 0;
  let strongBuyWins = 0;
  let strongSellWins = 0;

  for (let i = sixMonthStart; i < candles.length; i++) {
    const analysis = getSignal(candles, i);
    if (!analysis) continue;

    const signal = analysis.signalEn;
    const price = candles[i].close;

    if (signal === "STRONG BUY") {
      strongBuyCount++;
      const fwd = forwardReturn(candles, i, FORWARD_DAYS);
      if (fwd !== null && fwd > 0) strongBuyWins++;
    }

    if (signal === "STRONG SELL") {
      strongSellCount++;
      const fwd = forwardReturn(candles, i, FORWARD_DAYS);
      if (fwd !== null && fwd < 0) strongSellWins++;
    }

    if (
      (signal === "STRONG BUY" || signal === "BUY") &&
      !inPosition
    ) {
      inPosition = true;
      entryPrice = price;
      trades.push({ type: "BUY", dayIndex: i, price, signal });
    } else if (
      (signal === "STRONG SELL" || signal === "SELL") &&
      inPosition
    ) {
      const pnl = ((price - entryPrice) / entryPrice) * 100;
      totalTrades++;
      if (pnl > 0) winningTrades++;
      trades.push({ type: "SELL", dayIndex: i, price, signal });
      inPosition = false;
    }
  }

  if (inPosition) {
    const lastPrice = candles[candles.length - 1].close;
    const pnl = ((lastPrice - entryPrice) / entryPrice) * 100;
    totalTrades++;
    if (pnl > 0) winningTrades++;
    trades.push({
      type: "SELL",
      dayIndex: candles.length - 1,
      price: lastPrice,
      signal: "NEUTRAL",
    });
  }

  const startPrice = candles[sixMonthStart].close;
  const endPrice = candles[candles.length - 1].close;
  const buyHoldReturnPercent =
    startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;

  let strategyReturnPercent = 0;
  let cash = 10000;
  let shares = 0;

  for (const t of trades) {
    if (t.type === "BUY" && shares === 0) {
      shares = cash / t.price;
      cash = 0;
    } else if (t.type === "SELL" && shares > 0) {
      cash = shares * t.price;
      shares = 0;
    }
  }
  if (shares > 0) {
    cash = shares * candles[candles.length - 1].close;
    shares = 0;
  }
  strategyReturnPercent = ((cash - 10000) / 10000) * 100;

  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const strongBuySuccessRate =
    strongBuyCount > 0 ? (strongBuyWins / strongBuyCount) * 100 : 0;
  const strongSellSuccessRate =
    strongSellCount > 0 ? (strongSellWins / strongSellCount) * 100 : 0;

  const periodDays = candles.length - sixMonthStart;

  const summary =
    `Son ~${periodDays} gun: ${totalTrades} islem, %${winRate.toFixed(0)} basari. ` +
    `Strateji ${strategyReturnPercent >= 0 ? "+" : ""}${strategyReturnPercent.toFixed(1)}% vs ` +
    `Al-Tut ${buyHoldReturnPercent >= 0 ? "+" : ""}${buyHoldReturnPercent.toFixed(1)}%.`;

  return {
    symbol,
    periodDays,
    totalTrades,
    winningTrades,
    winRate,
    strategyReturnPercent,
    buyHoldReturnPercent,
    strongBuyCount,
    strongSellCount,
    strongBuySuccessRate,
    strongSellSuccessRate,
    trades: trades.slice(-10),
    summary,
  };
}
