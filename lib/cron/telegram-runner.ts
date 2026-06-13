import { analyzeStock } from "@/lib/indicators";
import { runGlobalNews, runStockNews } from "@/lib/news/engine";
import { buildEnhancedSignal } from "@/lib/signal-engine";
import { computeSectorTrends } from "@/lib/sectors";
import { sendTelegramAlert, isTelegramConfigured } from "@/lib/telegram/send";
import {
  fetchDailyOhlc,
  fetchLiveQuotes,
} from "@/lib/tradingview/market-data";
import {
  getServerWatchlist,
  sanitizeWatchlist,
} from "@/lib/watchlist";
import {
  loadCronRotationIndex,
  loadCronTelegramState,
  loadCronWatchlistOverride,
  saveCronRotationIndex,
  saveCronTelegramState,
} from "@/lib/cron/telegram-state";

const CHUNK_SIZE = 5;

export interface CronTelegramResult {
  ok: boolean;
  processed: string[];
  alertsSent: number;
  skipped: string[];
  error?: string;
}

async function analyzeSymbol(symbol: string) {
  const candles = await fetchDailyOhlc(symbol, 100);
  return analyzeStock(symbol, candles);
}

export async function runTelegramCronJob(): Promise<CronTelegramResult> {
  if (!isTelegramConfigured()) {
    return {
      ok: false,
      processed: [],
      alertsSent: 0,
      skipped: [],
      error: "Telegram ayarlari eksik.",
    };
  }

  const watchlist =
    loadCronWatchlistOverride() ?? getServerWatchlist();
  const symbols = sanitizeWatchlist(watchlist);

  if (symbols.length === 0) {
    return {
      ok: false,
      processed: [],
      alertsSent: 0,
      skipped: [],
      error: "Izleme listesi bos.",
    };
  }

  const rotation = loadCronRotationIndex();
  const chunk: string[] = [];
  for (let i = 0; i < CHUNK_SIZE && i < symbols.length; i++) {
    chunk.push(symbols[(rotation + i) % symbols.length]);
  }
  saveCronRotationIndex((rotation + CHUNK_SIZE) % symbols.length);

  const [quotes, globalNewsResult] = await Promise.all([
    fetchLiveQuotes(symbols),
    runGlobalNews(),
  ]);
  const globalNews = globalNewsResult.global;

  const prices = symbols.map((symbol) => ({
    symbol,
    price: quotes[symbol]?.price ?? null,
    changePercent: quotes[symbol]?.changePercent,
  }));

  const sectorTrends = computeSectorTrends(prices, {});

  const analysisResults = await Promise.all(
    chunk.map(async (symbol) => {
      try {
        return { symbol, analysis: await analyzeSymbol(symbol) };
      } catch {
        return { symbol, analysis: null };
      }
    })
  );

  const newsResults = await Promise.all(
    chunk.map(async (symbol) => {
      try {
        const stock = await runStockNews(symbol);
        return { symbol, stock };
      } catch {
        return { symbol, stock: null };
      }
    })
  );

  const state = loadCronTelegramState();
  let alertsSent = 0;
  const processed: string[] = [];
  const skipped: string[] = [];

  for (const symbol of chunk) {
    processed.push(symbol);
    const analysis =
      analysisResults.find((r) => r.symbol === symbol)?.analysis ?? null;
    const stockNews =
      newsResults.find((r) => r.symbol === symbol)?.stock ?? null;
    const price = quotes[symbol]?.price ?? null;

    if (!analysis) {
      skipped.push(symbol);
      continue;
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

  return {
    ok: true,
    processed,
    alertsSent,
    skipped,
  };
}

function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export { verifyCronSecret };
