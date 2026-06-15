"use client";

import { useEffect, useState } from "react";
import type { SignalRecord, SuccessScore } from "@/lib/signal-history";
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
  const [records, setRecords] = useState<SignalRecord[]>([]);

  useEffect(() => {
    if (!enabled || Object.keys(analysisMap).length === 0) return;

    let cancelled = false;

    async function sync() {
      const entries = [];

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

        entries.push({
          symbol,
          signalEn: enhanced.combined.signalEn,
          signalTr: enhanced.combined.signalTr,
          price,
          reason: enhanced.combined.reason,
          taSummary: buildTaSummary(analysis),
          technicalReason: analysis.technicalReason,
        });
      }

      try {
        const res = await fetch("/api/signals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prices, entries }),
        });

        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setScore(data.score ?? score);
            setRecords(data.records ?? []);
          }
          return;
        }
      } catch {
        // localStorage yedek
      }

      evaluateOpenSignals(prices);
      const state = loadSignalState();

      for (const entry of entries) {
        const next = recordSignalIfNew(
          entry.symbol,
          entry.signalEn,
          entry.price,
          state[entry.symbol],
          {
            signalTr: entry.signalTr,
            reason: entry.reason,
            taSummary: entry.taSummary,
            technicalReason: entry.technicalReason,
          }
        );
        if (next) state[entry.symbol] = next;
      }

      saveSignalState(state);
      if (!cancelled) {
        const localScore = getSuccessScore();
        setScore(localScore);
        setRecords(
          [...localScore.recent].sort((a, b) => b.timestamp - a.timestamp)
        );
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, [
    watchlist,
    analysisMap,
    stockNewsMap,
    globalNews,
    prices,
    sectorTrends,
    enabled,
  ]);

  return { score, records };
}
