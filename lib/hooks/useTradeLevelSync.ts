"use client";

import { useEffect } from "react";
import { buildEnhancedSignal } from "@/lib/signal-engine";
import type {
  GlobalNewsResult,
  StockAnalysis,
  StockNewsResult,
} from "@/lib/stocks";
import type { SectorId, SectorTrendInfo } from "@/lib/sectors";

interface UseTradeLevelSyncProps {
  watchlist: string[];
  analysisMap: Record<string, StockAnalysis>;
  stockNewsMap: Record<string, StockNewsResult>;
  globalNews: GlobalNewsResult | null;
  prices: { symbol: string; price: number | null }[];
  sectorTrends: Record<SectorId, SectorTrendInfo>;
  enabled: boolean;
}

export function useTradeLevelSync({
  watchlist,
  analysisMap,
  stockNewsMap,
  globalNews,
  prices,
  sectorTrends,
  enabled,
}: UseTradeLevelSyncProps) {
  useEffect(() => {
    if (!enabled || Object.keys(analysisMap).length === 0) return;

    const levels: Record<
      string,
      { stopLoss: number; takeProfit: number } | undefined
    > = {};

    for (const symbol of watchlist) {
      const analysis = analysisMap[symbol];
      const price = prices.find((p) => p.symbol === symbol)?.price ?? null;
      if (!analysis || price === null) continue;

      const { tradeLevels } = buildEnhancedSignal(
        symbol,
        analysis,
        stockNewsMap[symbol] ?? null,
        globalNews,
        price,
        sectorTrends
      );

      if (tradeLevels) {
        levels[symbol] = {
          stopLoss: tradeLevels.stopLoss,
          takeProfit: tradeLevels.takeProfit,
        };
      }
    }

    if (Object.keys(levels).length === 0) return;

    fetch("/api/cron/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ levels }),
    }).catch(() => {});
  }, [
    watchlist,
    analysisMap,
    stockNewsMap,
    globalNews,
    prices,
    sectorTrends,
    enabled,
  ]);
}
