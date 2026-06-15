import { analyzeStock } from "@/lib/indicators";
import { fetchKapDisclosures } from "@/lib/kap/feeds";
import { processKapAlerts, seedKapSeen } from "@/lib/kap/alerts";
import { runGlobalNews, runStockNews } from "@/lib/news/engine";
import { checkPriceLevelAlerts } from "@/lib/price-alerts";
import { buildEnhancedSignal } from "@/lib/signal-engine";
import { buildTaSummary } from "@/lib/signal-display";
import { syncSignals, type SignalSyncEntry } from "@/lib/signal-sync";
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
  type QuoteWithSource,
} from "@/lib/tradingview/market-data";
import {
  getServerWatchlist,
  sanitizeWatchlist,
} from "@/lib/watchlist";
import {
  loadLastScanSignals,
  loadCronWatchlistOverride,
  loadCronPriceAlertState,
  loadTradeLevelsCache,
  saveLastScanSignals,
  saveCronPriceAlertState,
  saveCronHeartbeat,
  upsertTradeLevelsCache,
} from "@/lib/cron/telegram-state";
import { shouldSendSignalTelegram } from "@/lib/cron/signal-notify";

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

async function analyzeSymbol(
  symbol: string,
  quotes: Record<string, QuoteWithSource>
) {
  const { candles } = await fetchDailyOhlc(symbol, 100);
  const quote = quotes[symbol];
  return analyzeStock(symbol, candles, {
    volume: quote?.volume,
    livePrice: quote?.price ?? undefined,
  });
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
  const MAX_KAP_PER_RUN = 2;

  for (const symbol of symbols) {
    if (sent >= MAX_KAP_PER_RUN) break;

    const items = await fetchKapDisclosures(symbol);
    if (items.length === 0) continue;

    await seedKapSeen(symbol, items);
    const result = await processKapAlerts(
      symbol,
      items,
      MAX_KAP_PER_RUN - sent
    );
    sent += result.sent;
  }

  return sent;
}

async function runPriceLevelChecks(
  symbols: string[],
  quotes: Record<string, { price?: number | null }>
): Promise<number> {
  const levelsCache = await loadTradeLevelsCache();
  let priceState = await loadCronPriceAlertState();
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

  await saveCronPriceAlertState(priceState);
  return sent;
}

async function scanAllSymbols(
  symbols: string[],
  quotes: Record<string, QuoteWithSource>
) {
  return mapInBatches(symbols, PARALLEL_BATCH, async (symbol) => {
    const [analysisResult, stockResult] = await Promise.allSettled([
      analyzeSymbol(symbol, quotes),
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
    await saveCronHeartbeat({
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
    (await loadCronWatchlistOverride()) ?? getServerWatchlist();
  const symbols = sanitizeWatchlist(watchlist);

  if (symbols.length === 0) {
    await saveCronHeartbeat({
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

  const [quotes, globalNewsResult] = await Promise.all([
    fetchLiveQuotes(symbols),
    runGlobalNews(),
  ]);

  const [kapAlertsSent, scanResults] = await Promise.all([
    runKapChecks(symbols),
    scanAllSymbols(symbols, quotes),
  ]);

  const globalNews = globalNewsResult.global;

  const prices = symbols.map((symbol) => ({
    symbol,
    price: quotes[symbol]?.price ?? null,
    changePercent: quotes[symbol]?.changePercent,
  }));

  const analysisMap: Record<string, NonNullable<Awaited<ReturnType<typeof analyzeSymbol>>>> = {};
  for (const row of scanResults) {
    if (row.analysis) analysisMap[row.symbol] = row.analysis;
  }

  const sectorTrends = computeSectorTrends(prices, analysisMap);

  const lastScan = await loadLastScanSignals();
  const nextScan = { ...lastScan };
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
      await upsertTradeLevelsCache(symbol, {
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

    const previous = lastScan[symbol];
    const current = combined.signalEn;
    nextScan[symbol] = current;

    if (!shouldSendSignalTelegram(previous, current)) {
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
      alertsSent++;
    } else {
      skipped.push(symbol);
    }
  }

  await saveLastScanSignals(nextScan);

  const syncEntries: SignalSyncEntry[] = [];
  for (const { symbol, analysis, stock: stockNews } of scanResults) {
    if (!analysis) continue;
    const price = quotes[symbol]?.price ?? null;
    const enhanced = buildEnhancedSignal(
      symbol,
      analysis,
      stockNews,
      globalNews,
      price,
      sectorTrends
    );
    syncEntries.push({
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
    await syncSignals(
      prices.map((p) => ({ symbol: p.symbol, price: p.price })),
      syncEntries
    );
  } catch {
    // Skor senkronu basarisiz olsa cron devam etsin
  }

  const quoteMap = Object.fromEntries(
    symbols.map((symbol) => [symbol, { price: quotes[symbol]?.price ?? null }])
  );
  const priceAlertsSent = await runPriceLevelChecks(symbols, quoteMap);

  await saveCronHeartbeat({
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
