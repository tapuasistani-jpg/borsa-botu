import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { analyzeStock } from "@/lib/indicators";
import {
  fetchDailyOhlc,
  fetchLiveQuotes,
} from "@/lib/tradingview/market-data";
import {
  getServerWatchlist,
  isValidBistSymbol,
  parseSymbolsParam,
} from "@/lib/watchlist";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

async function analyzeOne(symbol: string) {
  try {
    const [{ candles }, quotes] = await Promise.all([
      fetchDailyOhlc(symbol, 100),
      fetchLiveQuotes([symbol]),
    ]);
    const quote = quotes[symbol];
    const analysis = analyzeStock(symbol, candles, {
      volume: quote?.volume,
      livePrice: quote?.price ?? undefined,
    });
    return analysis ?? { symbol, error: true as const };
  } catch {
    return { symbol, error: true as const };
  }
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  const batchSymbols = parseSymbolsParam(searchParams.get("symbols"));

  try {
    if (symbol) {
      if (!isValidBistSymbol(symbol)) {
        return NextResponse.json({ error: "Gecersiz sembol." }, { status: 400 });
      }
      const result = await analyzeOne(symbol);
      return NextResponse.json({
        analysis: [result],
        updatedAt: new Date().toISOString(),
      });
    }

    const symbols = batchSymbols ?? getServerWatchlist();
    const results = await Promise.all(symbols.map((s) => analyzeOne(s)));

    return NextResponse.json({
      analysis: results,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Analiz verisi alinamadi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
