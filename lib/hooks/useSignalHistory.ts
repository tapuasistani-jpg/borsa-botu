"use client";

import { useEffect, useState } from "react";
import type { SuccessScore } from "@/lib/signal-history";
import {
  evaluateOpenSignals,
  getSuccessScore,
  loadSignalState,
  recordSignalIfNew,
  saveSignalState,
} from "@/lib/signal-history";
import { buildTaSummary } from "@/lib/signal-display";
import { buildEnhancedSignal } from "@/lib/signal-engine";
import type {
  GlobalNewsResult,
  StockAnalysis,
  StockNewsResult,
} from "@/lib/stocks";
import type { SectorId, SectorTrendInfo } from "@/lib/sectors";

interface UseSignalHistoryProps {
  watchlist: string[];
  analysisMap: Record<string, StockAnalysis>;
  stockNewsMap: Record<string, StockNewsResult>;
  globalNews: GlobalNewsResult | null;
  prices: { symbol: string; price: number | null }[];
  sectorTrends: Record<SectorId, SectorTrendInfo>;
  enabled: boolean;
}

export function useSignalHistory({
  watchlist,
  analysisMap,
  stockNewsMap,
  globalNews,
  prices,
  sectorTrends,
  enabled,
}: UseSignalHistoryProps) {
  const [score, setScore] = useState<SuccessScore>({
    percent: 0,
    wins: 0,
    total: 0,
    recent: [],
  });

  useEffect(() => {
    if (!enabled || Object.keys(analysisMap).length === 0) return;

    evaluateOpenSignals(prices);

    const state = loadSignalState();

    for (const symbol of watchlist) {
      const analysis = analysisMap[symbol];
      if (!analysis) continue;

      const price = prices.find((p) => p.symbol === symbol)?.price ?? null;
      const enhanced = buildEnhancedSignal(
        symbol,
        analysis,
        stockNewsMap[symbol] ?? null,
        globalNews,
        price,
        sectorTrends
      );

      const next = recordSignalIfNew(
        symbol,
        enhanced.combined.signalEn,
        price,
        state[symbol],
        {
          signalTr: enhanced.combined.signalTr,
          reason: enhanced.combined.reason,
          taSummary: buildTaSummary(analysis),
          technicalReason: analysis.technicalReason,
        }
      );
      if (next) {
        state[symbol] = next;
      }
    }

    saveSignalState(state);
    setScore(getSuccessScore());
  }, [
    watchlist,
    analysisMap,
    stockNewsMap,
    globalNews,
    prices,
    sectorTrends,
    enabled,
  ]);

  return score;
}
