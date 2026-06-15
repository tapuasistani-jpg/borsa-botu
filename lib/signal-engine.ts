import { combineTaAndNews } from "./news/combined-signal";
import type {
  CombinedSignal,
  GlobalNewsResult,
  StockNewsResult,
} from "./news/types";
import { calculateNetProfitPotential } from "./risk-reward";
import type { RiskRewardResult } from "./risk-reward";
import {
  getStockSectorInfo,
  type SectorId,
  type SectorTrendInfo,
  type StockSectorInfo,
} from "./sectors";
import { applyMarketContextFilter } from "./market-context";
import type { StockAnalysis } from "./stocks";
import { calculateTradeLevels, type TradeLevels } from "./trade-levels";

export interface EnhancedSignal {
  combined: CombinedSignal;
  tradeLevels: TradeLevels | null;
  riskReward: RiskRewardResult | null;
  sectorInfo: StockSectorInfo | null;
}

export interface EnhancedSignalOptions {
  bist100ChangePercent?: number | null;
}

export function buildEnhancedSignal(
  symbol: string,
  analysis: StockAnalysis | null,
  stockNews: StockNewsResult | null,
  globalNews: GlobalNewsResult | null,
  price: number | null,
  sectorTrends: Record<SectorId, SectorTrendInfo>,
  options?: EnhancedSignalOptions
): EnhancedSignal {
  const tradeLevels =
    analysis && price !== null && price > 0
      ? calculateTradeLevels(price, analysis)
      : null;

  const riskReward =
    tradeLevels && price !== null && price > 0
      ? calculateNetProfitPotential(price, tradeLevels.takeProfit)
      : null;

  const sectorInfo = getStockSectorInfo(symbol, sectorTrends);

  const raw = combineTaAndNews(analysis, stockNews, globalNews, {
    riskReward,
  });

  const combined = applyMarketContextFilter(raw, {
    bist100ChangePercent: options?.bist100ChangePercent,
    sectorInfo,
  });

  return { combined, tradeLevels, riskReward, sectorInfo };
}
