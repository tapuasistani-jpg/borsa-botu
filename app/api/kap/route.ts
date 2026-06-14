import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchKapForSymbols } from "@/lib/kap/feeds";
import { sanitizeWatchlist } from "@/lib/watchlist";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("symbols") ?? "";
  const symbols = sanitizeWatchlist(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );

  if (symbols.length === 0) {
    return NextResponse.json({ error: "Sembol gerekli." }, { status: 400 });
  }

  try {
    const feeds = await fetchKapForSymbols(symbols.slice(0, 15));
    return NextResponse.json({
      feeds,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "KAP verisi alinamadi.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
