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
import type { StockAnalysis } from "./stocks";
import { calculateTradeLevels, type TradeLevels } from "./trade-levels";

export interface EnhancedSignal {
  combined: CombinedSignal;
  tradeLevels: TradeLevels | null;
  riskReward: RiskRewardResult | null;
  sectorInfo: StockSectorInfo | null;
}

export function buildEnhancedSignal(
  symbol: string,
  analysis: StockAnalysis | null,
  stockNews: StockNewsResult | null,
  globalNews: GlobalNewsResult | null,
  price: number | null,
  sectorTrends: Record<SectorId, SectorTrendInfo>
): EnhancedSignal {
  const tradeLevels =
    analysis && price !== null && price > 0
      ? calculateTradeLevels(price, analysis)
      : null;

  const riskReward =
    tradeLevels && price !== null && price > 0
      ? calculateNetProfitPotential(price, tradeLevels.takeProfit)
      : null;

  const combined = combineTaAndNews(analysis, stockNews, globalNews, {
    riskReward,
  });

  const sectorInfo = getStockSectorInfo(symbol, sectorTrends);

  return { combined, tradeLevels, riskReward, sectorInfo };
}
