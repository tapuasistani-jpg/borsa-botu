import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchLiveQuotes } from "@/lib/tradingview/market-data";
import { HISSELER } from "@/lib/stocks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  try {
    const quotes = await fetchLiveQuotes([...HISSELER]);
    const prices = [...HISSELER].map((symbol) => ({
      symbol,
      price: quotes[symbol]?.price ?? null,
      changePercent: quotes[symbol]?.changePercent,
    }));

    return NextResponse.json({
      prices,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Fiyat verisi alinamadi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
