"use client";

import { useEffect, useRef } from "react";
import { buildEnhancedSignal } from "@/lib/signal-engine";
import { checkPriceLevelAlerts } from "@/lib/price-alerts";
import type {
  GlobalNewsResult,
  StockAnalysis,
  StockNewsResult,
} from "@/lib/stocks";
import type { SectorId, SectorTrendInfo } from "@/lib/sectors";

const STORAGE_KEY = "borsa_price_alert_state";

type PriceAlertState = Record<
  string,
  { slTriggered?: boolean; tpTriggered?: boolean }
>;

function loadState(): PriceAlertState {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveState(state: PriceAlertState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

interface UsePriceLevelAlertsProps {
  watchlist: string[];
  analysisMap: Record<string, StockAnalysis>;
  stockNewsMap: Record<string, StockNewsResult>;
  globalNews: GlobalNewsResult | null;
  prices: { symbol: string; price: number | null }[];
  sectorTrends: Record<SectorId, SectorTrendInfo>;
  enabled: boolean;
}

export function usePriceLevelAlerts({
  watchlist,
  analysisMap,
  stockNewsMap,
  globalNews,
  prices,
  sectorTrends,
  enabled,
}: UsePriceLevelAlertsProps) {
  const sendingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    let state = loadState();

    for (const symbol of watchlist) {
      const price = prices.find((p) => p.symbol === symbol)?.price;
      const analysis = analysisMap[symbol];
      if (price === null || price === undefined || !analysis) continue;

      const { tradeLevels } = buildEnhancedSignal(
        symbol,
        analysis,
        stockNewsMap[symbol] ?? null,
        globalNews,
        price,
        sectorTrends
      );

      if (!tradeLevels) continue;

      const { trigger, nextState } = checkPriceLevelAlerts(
        symbol,
        price,
        tradeLevels,
        state
      );
      state = nextState;

      if (!trigger || sendingRef.current.has(`${symbol}-${trigger.kind}`)) {
        continue;
      }

      sendingRef.current.add(`${symbol}-${trigger.kind}`);

      fetch("/api/telegram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "price",
          ...trigger,
        }),
      })
        .finally(() => {
          sendingRef.current.delete(`${symbol}-${trigger.kind}`);
          saveState(state);
        });
    }

    saveState(state);
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
