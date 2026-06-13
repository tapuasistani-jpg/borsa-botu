import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getSession } from "@/lib/auth";
import { analyzeStock } from "@/lib/indicators";
import { fetchDailyOhlc } from "@/lib/tradingview/market-data";
import { HISSELER } from "@/lib/stocks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

async function analyzeOne(symbol: string) {
  try {
    const candles = await fetchDailyOhlc(symbol, 100);
    const analysis = analyzeStock(symbol, candles);
    return analysis ?? { symbol, error: true as const };
  } catch {
    return { symbol, error: true as const };
  }
}

const getCachedAnalysis = unstable_cache(
  async () => {
    const results = [];
    for (const symbol of HISSELER) {
      results.push(await analyzeOne(symbol));
    }
    return results;
  },
  ["bist-analysis-all"],
  { revalidate: 300 }
);

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();

  try {
    if (symbol) {
      if (!HISSELER.includes(symbol as (typeof HISSELER)[number])) {
        return NextResponse.json({ error: "Gecersiz sembol." }, { status: 400 });
      }
      const result = await analyzeOne(symbol);
      return NextResponse.json({
        analysis: [result],
        updatedAt: new Date().toISOString(),
      });
    }

    const analysis = await getCachedAnalysis();
    return NextResponse.json({
      analysis,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Analiz verisi alinamadi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
