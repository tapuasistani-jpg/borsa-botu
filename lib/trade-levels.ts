import type { StockAnalysis } from "./stocks";

export interface TradeLevels {
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
}

export function calculateTradeLevels(
  price: number,
  analysis: StockAnalysis
): TradeLevels {
  const support = Math.min(analysis.bbLower, analysis.ema50);
  const stopLoss = Math.min(support * 0.995, price * 0.985);

  const risk = price - stopLoss;
  if (risk <= 0) {
    const fallbackSl = price * 0.97;
    const fallbackTp = price * 1.06;
    return {
      stopLoss: fallbackSl,
      takeProfit: fallbackTp,
      riskRewardRatio: (fallbackTp - price) / (price - fallbackSl),
    };
  }

  const rrTarget = price + risk * 2;
  const bandTarget = analysis.bbUpper;
  const takeProfit = Math.min(Math.max(rrTarget, bandTarget), price * 1.15);

  const reward = takeProfit - price;
  return {
    stopLoss,
    takeProfit,
    riskRewardRatio: reward / risk,
  };
}
