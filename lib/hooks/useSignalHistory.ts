"use client";

import { useEffect, useState } from "react";
import type { SignalRecord, SuccessScore } from "@/lib/signal-history";
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
  bist100ChangePercent?: number | null;
  enabled: boolean;
}

const EMPTY_SCORE: SuccessScore = {
  percent: 0,
  wins: 0,
  total: 0,
  open: 0,
  recent: [],
};

function sortRecords(records: SignalRecord[]) {
  return [...records].sort((a, b) => b.timestamp - a.timestamp);
}

export function useSignalHistory({
  watchlist,
  analysisMap,
  stockNewsMap,
  globalNews,
  prices,
  sectorTrends,
  bist100ChangePercent = null,
  enabled,
}: UseSignalHistoryProps) {
  const [score, setScore] = useState<SuccessScore>(EMPTY_SCORE);
  const [records, setRecords] = useState<SignalRecord[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);

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
          sectorTrends,
          { bist100ChangePercent }
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
        const getRes = await fetch("/api/signals");
        if (getRes.ok) {
          const getData = await getRes.json();
          if (!cancelled && Array.isArray(getData.records)) {
            setScore(getData.score ?? EMPTY_SCORE);
            setRecords(sortRecords(getData.records));
            setSyncError(null);
          }
        }

        const res = await fetch("/api/signals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prices, entries }),
        });

        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setScore(data.score ?? EMPTY_SCORE);
            setRecords(sortRecords(data.records ?? []));
            setSyncError(null);
          }
          return;
        }

        const errData = await res.json().catch(() => ({}));
        if (!cancelled) {
          setSyncError(
            typeof errData.error === "string"
              ? errData.error
              : "Sinyal senkronu basarisiz"
          );
        }
      } catch {
        if (!cancelled) {
          setSyncError("Sunucuya ulasilamadi — sinyal gecmisi guncellenemedi");
        }
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
    bist100ChangePercent,
    enabled,
  ]);

  return { score, records, syncError };
}
