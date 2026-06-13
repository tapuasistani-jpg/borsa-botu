import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runGlobalNews, runStockNews } from "@/lib/news/engine";
import { isValidBistSymbol } from "@/lib/watchlist";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

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
      if (!isValidBistSymbol(symbol)) {
        return NextResponse.json({ error: "Gecersiz sembol." }, { status: 400 });
      }
      const stock = await runStockNews(symbol);
      return NextResponse.json({
        stocks: { [symbol]: stock },
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: "scope=global veya symbol parametresi gerekli." },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Haber analizi alinamadi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
