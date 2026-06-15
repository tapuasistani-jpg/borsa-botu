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
import {
  LOW_VOLUME_SCORE_PENALTY,
  MIN_DAILY_VOLUME,
} from "./trading-config";

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

function scoreLabel(score: number): string {
  if (score > 0) return "AL";
  if (score < 0) return "SAT";
  return "Notr";
}

function bbPositionLabel(
  price: number,
  lower: number,
  upper: number,
  middle: number
): string {
  if (price <= lower) return "alt band";
  if (price >= upper) return "ust band";
  if (price > middle) return "orta-ust";
  if (price < middle) return "orta-alt";
  return "orta";
}

export function buildTechnicalReason(input: {
  price: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  ema20: number;
  ema50: number;
  bbLower: number;
  bbUpper: number;
  bbMiddle: number;
  scores: IndicatorScores;
  totalScore: number;
}): string {
  const {
    price,
    rsi,
    macd,
    macdSignal,
    ema20,
    ema50,
    bbLower,
    bbUpper,
    bbMiddle,
    scores,
    totalScore,
  } = input;

  const triggers: string[] = [];
  if (scores.rsi !== 0) {
    triggers.push(`RSI ${rsi.toFixed(1)}→${scoreLabel(scores.rsi)}`);
  }
  if (scores.macd !== 0) {
    const dir = macd > macdSignal ? "yukari" : "asagi";
    triggers.push(`MACD ${macd.toFixed(3)} ${dir}→${scoreLabel(scores.macd)}`);
  }
  if (scores.bollinger !== 0) {
    triggers.push(
      `BB ${bbPositionLabel(price, bbLower, bbUpper, bbMiddle)}→${scoreLabel(scores.bollinger)}`
    );
  }
  if (scores.ema !== 0) {
    triggers.push(
      `EMA20 ${ema20.toFixed(2)}/50 ${ema50.toFixed(2)}→${scoreLabel(scores.ema)}`
    );
  }

  const triggerText =
    triggers.length > 0 ? triggers.join(" · ") : "Net yon yok (karisik indikatörler)";

  const scoreText = `Puan ${totalScore >= 0 ? "+" : ""}${totalScore}`;

  return `${triggerText} | ${scoreText}`;
}

export function decisionFromScore(total: number): {
  signalEn: SignalType;
  signalTr: string;
  color: SignalColor;
  totalScore: number;
} {
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

export function combinedDecision(scores: number[]): {
  signalEn: SignalType;
  signalTr: string;
  color: SignalColor;
  totalScore: number;
} {
  const total = scores.reduce((a, b) => a + b, 0);
  return decisionFromScore(total);
}

function applyVolumeCalibration(
  decision: ReturnType<typeof combinedDecision>,
  volume?: number
): ReturnType<typeof combinedDecision> {
  if (volume == null || volume >= MIN_DAILY_VOLUME) {
    return decision;
  }

  const isBuy =
    decision.signalEn === "STRONG BUY" || decision.signalEn === "BUY";
  if (!isBuy) return decision;

  return decisionFromScore(decision.totalScore - LOW_VOLUME_SCORE_PENALTY);
}

export interface OhlcCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export function analyzeStock(
  symbol: string,
  candles: OhlcCandle[],
  options?: { volume?: number; livePrice?: number }
): StockAnalysis | null {
  if (candles.length < 50) return null;

  const closes = candles.map((c) => c.close);
  let price = closes[closes.length - 1];
  if (options?.livePrice != null && Number.isFinite(options.livePrice)) {
    price = options.livePrice;
  }
  const volume = options?.volume ?? candles.at(-1)?.volume;

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

  const baseDecision = combinedDecision(Object.values(scores));
  const decision = applyVolumeCalibration(baseDecision, volume);
  const volumeOk = volume == null ? undefined : volume >= MIN_DAILY_VOLUME;
  const now = new Date().toLocaleTimeString("tr-TR");
  const macdValue = macd.MACD;
  const macdSignalValue = macd.signal;

  const technicalReason =
    volume != null && volume < MIN_DAILY_VOLUME && baseDecision.totalScore >= 3
      ? `${buildTechnicalReason({
          price,
          rsi,
          macd: macdValue,
          macdSignal: macdSignalValue,
          ema20,
          ema50,
          bbLower: bb.lower,
          bbUpper: bb.upper,
          bbMiddle: bb.middle,
          scores,
          totalScore: decision.totalScore,
        })} | Hacim dusuk (${Math.round(volume).toLocaleString("tr-TR")})`
      : buildTechnicalReason({
          price,
          rsi,
          macd: macdValue,
          macdSignal: macdSignalValue,
          ema20,
          ema50,
          bbLower: bb.lower,
          bbUpper: bb.upper,
          bbMiddle: bb.middle,
          scores,
          totalScore: decision.totalScore,
        });

  return {
    symbol,
    signalEn: decision.signalEn,
    signalTr: decision.signalTr,
    color: decision.color,
    totalScore: decision.totalScore,
    scores,
    price,
    rsi,
    macd: macdValue,
    macdSignal: macdSignalValue,
    ema20,
    ema50,
    bbLower: bb.lower,
    bbUpper: bb.upper,
    bbMiddle: bb.middle,
    technicalReason,
    volume,
    volumeOk,
    updatedAt: now,
  };
}
