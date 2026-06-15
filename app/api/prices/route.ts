import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchLiveQuotes } from "@/lib/tradingview/market-data";
import {
  getServerWatchlist,
  parseSymbolsParam,
  sanitizeWatchlist,
} from "@/lib/watchlist";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const symbols =
    parseSymbolsParam(searchParams.get("symbols")) ?? getServerWatchlist();

  try {
    const quotes = await fetchLiveQuotes(symbols);
    const prices = symbols.map((symbol) => ({
      symbol,
      price: quotes[symbol]?.price ?? null,
      changePercent: quotes[symbol]?.changePercent,
      source: quotes[symbol]?.source,
    }));

    const sources = new Set(
      prices.map((p) => p.source).filter(Boolean)
    );
    const priceSource =
      sources.size === 0
        ? undefined
        : sources.size === 1
          ? [...sources][0]
          : "mixed";

    return NextResponse.json({
      prices,
      symbols,
      priceSource,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Fiyat verisi alinamadi.";
    console.error("prices API:", message);
    return NextResponse.json({
      prices: symbols.map((symbol) => ({ symbol, price: null })),
      symbols,
      updatedAt: new Date().toISOString(),
      warning: message,
    });
  }
}
