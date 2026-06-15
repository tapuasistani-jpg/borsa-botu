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
    signalEn === "RISKY BUY" ||
    signalEn === "STRONG SELL" ||
    signalEn === "SELL"
  );
}

export function isStrongSignal(signalEn: string): boolean {
  return signalEn === "STRONG BUY" || signalEn === "STRONG SELL";
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

export function stockCardClass(tone: SignalTone, signalEn: string): string {
  const parts = ["stock-card"];
  if (tone === "buy") parts.push("stock-card-buy");
  else if (tone === "sell") parts.push("stock-card-sell");
  else if (tone === "risky") parts.push("stock-card-risky");

  if (shouldPulseSignal(signalEn)) parts.push("stock-card-action");
  if (isStrongSignal(signalEn)) parts.push("stock-card-strong");

  return parts.join(" ");
}

export function signalStripClass(tone: SignalTone, signalEn: string): string {
  const parts = ["signal-strip"];

  if (tone === "buy") parts.push("signal-strip-buy");
  else if (tone === "sell") parts.push("signal-strip-sell");
  else if (tone === "risky") parts.push("signal-strip-risky");
  else parts.push("signal-strip-hold");

  if (shouldPulseSignal(signalEn)) parts.push("signal-pulse");
  if (isStrongSignal(signalEn)) parts.push("signal-pulse-strong");

  return parts.join(" ");
}
