import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runBacktest } from "@/lib/backtest";
import { fetchDailyOhlc } from "@/lib/tradingview/market-data";
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
  const symbol = (searchParams.get("symbol") ?? "THYAO").toUpperCase();

  if (!isValidBistSymbol(symbol)) {
    return NextResponse.json({ error: "Gecersiz hisse sembolu." }, { status: 400 });
  }

  try {
    const candles = await fetchDailyOhlc(symbol, 150);
    const result = runBacktest(symbol, candles);

    if (!result) {
      return NextResponse.json(
        { error: "Yeterli gecmis veri yok. Baska hisse dene." },
        { status: 422 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Backtest calistirilamadi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
