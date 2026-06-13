export const BABA_KAGITLAR = [
  "THYAO", "TUPRS", "EREGL", "ASELS", "AKBNK",
  "ISCTR", "BIMAS", "FROTO", "KCHOL", "SAHOL",
] as const;

export const HAREKETLI_KAGITLAR = [
  "REEDR", "ASTOR", "KONTR", "YEOTK", "SMRTG",
] as const;

export const HISSELER = [...BABA_KAGITLAR, ...HAREKETLI_KAGITLAR] as const;

export type Hisse = (typeof HISSELER)[number];

export type SignalType =
  | "STRONG BUY"
  | "BUY"
  | "NEUTRAL"
  | "SELL"
  | "STRONG SELL";

export type SignalColor = "green" | "yellow" | "red";

export interface IndicatorScores {
  rsi: number;
  macd: number;
  bollinger: number;
  ema: number;
}

export interface StockAnalysis {
  symbol: string;
  signalEn: SignalType;
  signalTr: string;
  color: SignalColor;
  totalScore: number;
  scores: IndicatorScores;
  rsi: number;
  macd: number;
  macdSignal: number;
  ema20: number;
  ema50: number;
  bbLower: number;
  bbUpper: number;
  bbMiddle: number;
  updatedAt: string;
}

export interface StockPrice {
  symbol: string;
  price: number | null;
  changePercent?: number;
}

export type { CombinedSignal, GlobalNewsResult, NewsEngineResult, NewsSentiment, StockNewsResult } from "./news/types";

export function tvSymbol(symbol: string): string {
  return `BIST:${symbol}`;
}
