import { analyzeStock } from "@/lib/indicators";
import { fetchKapDisclosures } from "@/lib/kap/feeds";
import { processKapAlerts, seedKapSeen } from "@/lib/kap/alerts";
import { runGlobalNews, runStockNews } from "@/lib/news/engine";
import { checkPriceLevelAlerts } from "@/lib/price-alerts";
import { buildEnhancedSignal } from "@/lib/signal-engine";
import { computeSectorTrends } from "@/lib/sectors";
import {
  sendTelegramAlert,
  sendTelegramPriceAlert,
  isTelegramConfigured,
} from "@/lib/telegram/send";
import { calculateTradeLevels } from "@/lib/trade-levels";
import {
  fetchDailyOhlc,
  fetchLiveQuotes,
} from "@/lib/tradingview/market-data";
import {
  getServerWatchlist,
  sanitizeWatchlist,
} from "@/lib/watchlist";
import {
  loadCronTelegramState,
  loadCronWatchlistOverride,
  loadCronPriceAlertState,
  loadTradeLevelsCache,
  saveCronTelegramState,
  saveCronPriceAlertState,
  saveCronHeartbeat,
  upsertTradeLevelsCache,
} from "@/lib/cron/telegram-state";

/** Ayni anda kac hisse icin Yahoo/RSS cagrisi yapilacak */
const PARALLEL_BATCH = 5;

export interface CronTelegramResult {
  ok: boolean;
  processed: string[];
  alertsSent: number;
  kapAlertsSent: number;
  priceAlertsSent: number;
  skipped: string[];
  symbolCount: number;
  error?: string;
}

async function analyzeSymbol(symbol: string) {
  const candles = await fetchDailyOhlc(symbol, 100);
  return analyzeStock(symbol, candles);
}

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

async function runKapChecks(symbols: string[]): Promise<number> {
  let sent = 0;

  await mapInBatches(symbols, PARALLEL_BATCH, async (symbol) => {
    const items = await fetchKapDisclosures(symbol);
    if (items.length === 0) return;

    seedKapSeen(symbol, items);
    const result = await processKapAlerts(symbol, items);
    sent += result.sent;
  });

  return sent;
}

async function runPriceLevelChecks(
  symbols: string[],
  quotes: Record<string, { price?: number | null }>
): Promise<number> {
  const levelsCache = loadTradeLevelsCache();
  let priceState = loadCronPriceAlertState();
  let sent = 0;

  for (const symbol of symbols) {
    const price = quotes[symbol]?.price;
    const cached = levelsCache[symbol];
    if (typeof price !== "number" || !cached) continue;

    const levels = {
      stopLoss: cached.stopLoss,
      takeProfit: cached.takeProfit,
      riskRewardRatio: 0,
    };

    const { trigger, nextState } = checkPriceLevelAlerts(
      symbol,
      price,
      levels,
      priceState
    );
    priceState = nextState;

    if (trigger) {
      const result = await sendTelegramPriceAlert(trigger);
      if (result.ok) sent++;
    }
  }

  saveCronPriceAlertState(priceState);
  return sent;
}

async function scanAllSymbols(symbols: string[]) {
  return mapInBatches(symbols, PARALLEL_BATCH, async (symbol) => {
    const [analysisResult, stockResult] = await Promise.allSettled([
      analyzeSymbol(symbol),
      runStockNews(symbol),
    ]);

    return {
      symbol,
      analysis:
        analysisResult.status === "fulfilled" ? analysisResult.value : null,
      stock: stockResult.status === "fulfilled" ? stockResult.value : null,
    };
  });
}

export async function runTelegramCronJob(): Promise<CronTelegramResult> {
  const startedAt = new Date().toISOString();

  if (!isTelegramConfigured()) {
    saveCronHeartbeat({
      lastRunAt: startedAt,
      alertsSent: 0,
      kapAlertsSent: 0,
      priceAlertsSent: 0,
      processed: [],
      ok: false,
      error: "Telegram ayarlari eksik.",
    });
    return {
      ok: false,
      processed: [],
      alertsSent: 0,
      kapAlertsSent: 0,
      priceAlertsSent: 0,
      skipped: [],
      symbolCount: 0,
      error: "Telegram ayarlari eksik.",
    };
  }

  const watchlist =
    loadCronWatchlistOverride() ?? getServerWatchlist();
  const symbols = sanitizeWatchlist(watchlist);

  if (symbols.length === 0) {
    saveCronHeartbeat({
      lastRunAt: startedAt,
      alertsSent: 0,
      kapAlertsSent: 0,
      priceAlertsSent: 0,
      processed: [],
      ok: false,
      error: "Izleme listesi bos.",
    });
    return {
      ok: false,
      processed: [],
      alertsSent: 0,
      kapAlertsSent: 0,
      priceAlertsSent: 0,
      skipped: [],
      symbolCount: 0,
      error: "Izleme listesi bos.",
    };
  }

  const [quotes, globalNewsResult, kapAlertsSent, scanResults] =
    await Promise.all([
      fetchLiveQuotes(symbols),
      runGlobalNews(),
      runKapChecks(symbols),
      scanAllSymbols(symbols),
    ]);

  const globalNews = globalNewsResult.global;

  const prices = symbols.map((symbol) => ({
    symbol,
    price: quotes[symbol]?.price ?? null,
    changePercent: quotes[symbol]?.changePercent,
  }));

  const sectorTrends = computeSectorTrends(prices, {});

  const state = loadCronTelegramState();
  let alertsSent = 0;
  const processed: string[] = [];
  const skipped: string[] = [];

  for (const { symbol, analysis, stock: stockNews } of scanResults) {
    processed.push(symbol);
    const price = quotes[symbol]?.price ?? null;

    if (!analysis) {
      skipped.push(symbol);
      continue;
    }

    if (price !== null && price > 0) {
      const tradeLevels = calculateTradeLevels(price, analysis);
      upsertTradeLevelsCache(symbol, {
        stopLoss: tradeLevels.stopLoss,
        takeProfit: tradeLevels.takeProfit,
      });
    }

    const { combined } = buildEnhancedSignal(
      symbol,
      analysis,
      stockNews,
      globalNews,
      price,
      sectorTrends
    );

    const isStrong =
      combined.signalEn === "STRONG BUY" ||
      combined.signalEn === "STRONG SELL";

    if (!isStrong) {
      if (
        state[symbol] === "STRONG BUY" ||
        state[symbol] === "STRONG SELL"
      ) {
        state[symbol] = combined.signalEn;
      }
      continue;
    }

    if (state[symbol] === combined.signalEn) {
      skipped.push(symbol);
      continue;
    }

    const result = await sendTelegramAlert({
      symbol,
      signalEn: combined.signalEn,
      signalTr: combined.signalTr,
      price,
      reason: combined.reason,
    });

    if (result.ok) {
      state[symbol] = combined.signalEn;
      alertsSent++;
    } else {
      skipped.push(symbol);
    }
  }

  saveCronTelegramState(state);

  const quoteMap = Object.fromEntries(
    symbols.map((symbol) => [symbol, { price: quotes[symbol]?.price ?? null }])
  );
  const priceAlertsSent = await runPriceLevelChecks(symbols, quoteMap);

  saveCronHeartbeat({
    lastRunAt: new Date().toISOString(),
    alertsSent,
    kapAlertsSent,
    priceAlertsSent,
    processed,
    ok: true,
  });

  return {
    ok: true,
    processed,
    alertsSent,
    kapAlertsSent,
    priceAlertsSent,
    skipped,
    symbolCount: symbols.length,
  };
}
