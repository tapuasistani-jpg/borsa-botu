import { tvSymbol } from "../stocks";
import {
  closeSession,
  collectMessages,
  connectTradingView,
  send,
  type TradingViewSession,
} from "./ws-client";

export interface QuoteData {
  price: number;
  changePercent?: number;
}

function normalizeSymbol(name: string): string | null {
  if (name.startsWith("BIST:")) {
    return name.replace("BIST:", "");
  }
  if (name.startsWith("=")) {
    try {
      const parsed = JSON.parse(name.slice(1)) as { symbol?: string };
      return parsed.symbol?.replace("BIST:", "") ?? null;
    } catch {
      return null;
    }
  }
  return name.replace("BIST:", "") || null;
}

export async function fetchLiveQuotes(
  symbols: string[]
): Promise<Record<string, QuoteData>> {
  const session = await connectTradingView();
  const quotes: Record<string, QuoteData> = {};
  const tvSymbols = symbols.map(tvSymbol);

  for (const sym of tvSymbols) {
    const resolve = JSON.stringify({ adjustment: "splits", symbol: sym });
    send(session.ws, "quote_add_symbols", [session.quoteSession, `=${resolve}`]);
  }
  send(session.ws, "quote_fast_symbols", [session.quoteSession, ...tvSymbols]);

  await collectMessages(session.ws, 5000, (packet) => {
    if (packet.m !== "qsd") return;

    const payload = packet.p as unknown[];
    if (!Array.isArray(payload) || payload.length < 2) return;

    const detail = payload[1] as {
      n?: string;
      s?: string;
      v?: { lp?: number; chp?: number };
    };

    if (detail.s !== "ok" || !detail.n || !detail.v?.lp) return;

    const symbol = normalizeSymbol(detail.n);
    if (!symbol) return;

    quotes[symbol] = {
      price: detail.v.lp,
      changePercent: detail.v.chp,
    };
  });

  closeSession(session);
  return quotes;
}

export async function fetchDailyOhlc(
  symbol: string,
  candleCount = 100
): Promise<
  { open: number; high: number; low: number; close: number; volume?: number }[]
> {
  const session = await connectTradingView();
  const exchangeSymbol = tvSymbol(symbol);
  const resolve = JSON.stringify({ adjustment: "splits", symbol: exchangeSymbol });

  send(session.ws, "quote_add_symbols", [
    session.quoteSession,
    `=${resolve}`,
  ]);
  send(session.ws, "resolve_symbol", [
    session.chartSession,
    "sds_sym_1",
    `=${resolve}`,
  ]);
  send(session.ws, "create_series", [
    session.chartSession,
    "sds_1",
    "s1",
    "sds_sym_1",
    "1D",
    candleCount,
    "",
  ]);
  send(session.ws, "quote_fast_symbols", [session.quoteSession, exchangeSymbol]);

  let candles: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }[] = [];

  await collectMessages(session.ws, 8000, (packet) => {
    if (packet.m !== "timescale_update") return;

    const payload = packet.p as unknown[];
    if (!Array.isArray(payload) || payload.length < 2) return;

    const series = (payload[1] as Record<string, { s?: { v: number[] }[] }>)
      ?.sds_1?.s;

    if (!series?.length) return;

    candles = series.map((entry) => ({
      open: entry.v[1],
      high: entry.v[2],
      low: entry.v[3],
      close: entry.v[4],
      volume: entry.v[5],
    }));
  });

  closeSession(session);
  return candles;
}
