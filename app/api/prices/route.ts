import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchLiveQuotes } from "@/lib/tradingview/market-data";
import { HISSELER } from "@/lib/stocks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

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
    console.error("prices API:", message);
    return NextResponse.json({
      prices: [...HISSELER].map((symbol) => ({
        symbol,
        price: null,
      })),
      updatedAt: new Date().toISOString(),
      warning: message,
    });
  }
}
