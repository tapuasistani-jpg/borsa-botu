"use client";

import { useEffect, useRef } from "react";
import { buildEnhancedSignal } from "@/lib/signal-engine";
import type {
  GlobalNewsResult,
  StockAnalysis,
  StockNewsResult,
} from "@/lib/stocks";
import type { SectorId, SectorTrendInfo } from "@/lib/sectors";

const STORAGE_KEY = "borsa_telegram_state";

type AlertState = Record<string, string>;

function loadState(): AlertState {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveState(state: AlertState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

interface UseTelegramAlertsProps {
  analysisMap: Record<string, StockAnalysis>;
  stockNewsMap: Record<string, StockNewsResult>;
  globalNews: GlobalNewsResult | null;
  prices: { symbol: string; price: number | null }[];
  sectorTrends: Record<SectorId, SectorTrendInfo>;
  enabled: boolean;
}

export function useTelegramAlerts({
  analysisMap,
  stockNewsMap,
  globalNews,
  prices,
  sectorTrends,
  enabled,
}: UseTelegramAlertsProps) {
  const sendingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || Object.keys(analysisMap).length === 0) return;

    const state = loadState();

    for (const symbol of Object.keys(analysisMap)) {
      const analysis = analysisMap[symbol];
      if (!analysis) continue;

      const price = prices.find((p) => p.symbol === symbol)?.price ?? null;
      const { combined } = buildEnhancedSignal(
        symbol,
        analysis,
        stockNewsMap[symbol] ?? null,
        globalNews,
        price,
        sectorTrends
      );

      const isStrong =
        combined.signalEn === "STRONG BUY" ||
        combined.signalEn === "STRONG SELL";

      const prev = state[symbol];

      if (!isStrong) {
        if (prev === "STRONG BUY" || prev === "STRONG SELL") {
          state[symbol] = combined.signalEn;
          saveState(state);
        }
        continue;
      }

      if (prev === combined.signalEn || sendingRef.current.has(symbol)) {
        continue;
      }

      sendingRef.current.add(symbol);

      fetch("/api/telegram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          signalEn: combined.signalEn,
          signalTr: combined.signalTr,
          price,
          reason: combined.reason,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) {
            state[symbol] = combined.signalEn;
            saveState(state);
          }
        })
        .finally(() => {
          sendingRef.current.delete(symbol);
        });
    }
  }, [analysisMap, stockNewsMap, globalNews, prices, sectorTrends, enabled]);
}
