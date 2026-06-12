import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getSession } from "@/lib/auth";
import { analyzeStock } from "@/lib/indicators";
import { fetchDailyOhlc } from "@/lib/tradingview/market-data";
import { HISSELER } from "@/lib/stocks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function analyzeAllStocks() {
  const symbols = [...HISSELER];
  const results: Awaited<ReturnType<typeof analyzeOne>>[] = [];

  // Vercel zaman asimini onlemek icin 3'erli gruplar halinde analiz
  for (let i = 0; i < symbols.length; i += 3) {
    const batch = symbols.slice(i, i + 3);
    const batchResults = await Promise.all(batch.map(analyzeOne));
    results.push(...batchResults);
  }

  return results;
}

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
  analyzeAllStocks,
  ["bist-analysis"],
  { revalidate: 300 }
);

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  try {
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
