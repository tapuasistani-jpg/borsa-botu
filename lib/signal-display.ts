import type { StockAnalysis } from "./stocks";

export type SignalTone = "buy" | "sell" | "hold" | "risky";

export function getSignalTone(signalEn: string): SignalTone {
  if (signalEn === "STRONG BUY" || signalEn === "BUY") return "buy";
  if (signalEn === "RISKY BUY") return "risky";
  if (signalEn === "STRONG SELL" || signalEn === "SELL") return "sell";
  return "hold";
}

export function shouldPulseSignal(signalEn: string): boolean {
  return (
    signalEn === "STRONG BUY" ||
    signalEn === "BUY" ||
    signalEn === "STRONG SELL" ||
    signalEn === "SELL"
  );
}

export function buildTaSummary(analysis: StockAnalysis | null): string {
  if (!analysis) return "—";

  const chip = (score: number) =>
    score > 0 ? "AL" : score < 0 ? "SAT" : "Notr";

  return [
    `RSI:${chip(analysis.scores.rsi)}`,
    `MACD:${chip(analysis.scores.macd)}`,
    `BB:${chip(analysis.scores.bollinger)}`,
    `EMA:${chip(analysis.scores.ema)}`,
    `Teknik:${analysis.signalTr}`,
  ].join(" · ");
}

export function stockCardClass(tone: SignalTone): string {
  if (tone === "buy") return "stock-card stock-card-buy";
  if (tone === "sell") return "stock-card stock-card-sell";
  if (tone === "risky") return "stock-card stock-card-risky";
  return "stock-card";
}

export function signalStripClass(tone: SignalTone, pulse: boolean): string {
  const base =
    tone === "buy"
      ? "signal-strip signal-strip-buy"
      : tone === "sell"
        ? "signal-strip signal-strip-sell"
        : tone === "risky"
          ? "signal-strip signal-strip-risky"
          : "signal-strip signal-strip-hold";
  return pulse ? `${base} signal-pulse` : base;
}
