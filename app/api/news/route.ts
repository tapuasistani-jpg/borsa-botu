import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getSession } from "@/lib/auth";
import {
  runGlobalNews,
  runNewsEngine,
  runStockNews,
} from "@/lib/news/engine";
import { HISSELER } from "@/lib/stocks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

const getCachedNews = unstable_cache(runNewsEngine, ["bist-news"], {
  revalidate: 900,
});

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  const scope = searchParams.get("scope");

  try {
    if (scope === "global") {
      const { global, keywordBankSize } = await runGlobalNews();
      return NextResponse.json({
        global,
        stocks: {},
        keywordBankSize,
        updatedAt: new Date().toISOString(),
      });
    }

    if (symbol) {
      if (!HISSELER.includes(symbol as (typeof HISSELER)[number])) {
        return NextResponse.json({ error: "Gecersiz sembol." }, { status: 400 });
      }
      const stock = await runStockNews(symbol);
      return NextResponse.json({
        stocks: { [symbol]: stock },
        updatedAt: new Date().toISOString(),
      });
    }

    const data = await getCachedNews();
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Haber analizi alinamadi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
