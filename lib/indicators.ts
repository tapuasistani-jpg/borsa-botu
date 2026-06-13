import {
  BollingerBands,
  EMA,
  MACD,
  RSI,
} from "technicalindicators";
import type {
  IndicatorScores,
  SignalColor,
  SignalType,
  StockAnalysis,
} from "./stocks";

export const MUM_SAYISI = 100;

function rsiScore(rsi: number): number {
  if (rsi < 35) return 1;
  if (rsi > 65) return -1;
  return 0;
}

function macdScore(macd: number, signal: number): number {
  if (macd > signal) return 1;
  if (macd < signal) return -1;
  return 0;
}

function bollingerScore(
  price: number,
  lower: number,
  upper: number,
  middle: number
): number {
  if (price <= lower) return 1;
  if (price >= upper) return -1;
  if (price > middle) return 1;
  if (price < middle) return -1;
  return 0;
}

function emaScore(price: number, ema20: number, ema50: number): number {
  if (price > ema20 && ema20 > ema50) return 1;
  if (price < ema20 && ema20 < ema50) return -1;
  return 0;
}

export function combinedDecision(scores: number[]): {
  signalEn: SignalType;
  signalTr: string;
  color: SignalColor;
  totalScore: number;
} {
  const total = scores.reduce((a, b) => a + b, 0);

  if (total === 4) {
    return { signalEn: "STRONG BUY", signalTr: "GÜÇLÜ AL", color: "green", totalScore: total };
  }
  if (total === 3) {
    return { signalEn: "BUY", signalTr: "AL", color: "green", totalScore: total };
  }
  if (total === -4) {
    return { signalEn: "STRONG SELL", signalTr: "GÜÇLÜ SAT", color: "red", totalScore: total };
  }
  if (total === -3) {
    return { signalEn: "SELL", signalTr: "SAT", color: "red", totalScore: total };
  }
  return { signalEn: "NEUTRAL", signalTr: "BEKLE", color: "yellow", totalScore: total };
}

export interface OhlcCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export function analyzeStock(symbol: string, candles: OhlcCandle[]): StockAnalysis | null {
  if (candles.length < 50) return null;

  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];

  const rsiValues = RSI.calculate({ values: closes, period: 14 });
  const macdValues = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const bbValues = BollingerBands.calculate({
    values: closes,
    period: 20,
    stdDev: 2,
  });
  const ema20Values = EMA.calculate({ values: closes, period: 20 });
  const ema50Values = EMA.calculate({ values: closes, period: 50 });

  const rsi = rsiValues.at(-1);
  const macd = macdValues.at(-1);
  const bb = bbValues.at(-1);
  const ema20 = ema20Values.at(-1);
  const ema50 = ema50Values.at(-1);

  if (
    rsi === undefined ||
    !macd ||
    macd.MACD === undefined ||
    macd.signal === undefined ||
    !bb ||
    bb.upper === undefined ||
    bb.lower === undefined ||
    bb.middle === undefined ||
    ema20 === undefined ||
    ema50 === undefined
  ) {
    return null;
  }

  const scores: IndicatorScores = {
    rsi: rsiScore(rsi),
    macd: macdScore(macd.MACD, macd.signal),
    bollinger: bollingerScore(price, bb.lower, bb.upper, bb.middle),
    ema: emaScore(price, ema20, ema50),
  };

  const decision = combinedDecision(Object.values(scores));
  const now = new Date().toLocaleTimeString("tr-TR");

  return {
    symbol,
    signalEn: decision.signalEn,
    signalTr: decision.signalTr,
    color: decision.color,
    totalScore: decision.totalScore,
    scores,
    rsi,
    macd: macd.MACD,
    macdSignal: macd.signal,
    ema20,
    ema50,
    bbLower: bb.lower,
    bbUpper: bb.upper,
    bbMiddle: bb.middle,
    updatedAt: now,
  };
}
