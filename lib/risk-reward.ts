import {
  COMMISSION_RATE,
  MIN_NET_PROFIT_PERCENT,
} from "./trading-config";

export interface RiskRewardResult {
  grossProfitPercent: number;
  commissionPercent: number;
  netProfitPercent: number;
  passesThreshold: boolean;
}

export function calculateNetProfitPotential(
  entryPrice: number,
  takeProfit: number,
  commissionRate = COMMISSION_RATE,
  minNetProfitPercent = MIN_NET_PROFIT_PERCENT
): RiskRewardResult {
  const grossProfitPercent =
    ((takeProfit - entryPrice) / entryPrice) * 100;
  const commissionPercent = commissionRate * 2 * 100;
  const netProfitPercent = grossProfitPercent - commissionPercent;

  return {
    grossProfitPercent,
    commissionPercent,
    netProfitPercent,
    passesThreshold: netProfitPercent >= minNetProfitPercent,
  };
}
