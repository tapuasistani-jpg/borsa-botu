import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  loadCronWatchlistOverride,
  saveCronWatchlistOverride,
} from "@/lib/cron/telegram-state";
import {
  getServerWatchlist,
  sanitizeWatchlist,
} from "@/lib/watchlist";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const symbols =
    loadCronWatchlistOverride() ?? getServerWatchlist();

  return NextResponse.json({
    symbols,
    source: loadCronWatchlistOverride() ? "synced" : "env_or_default",
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const symbols = sanitizeWatchlist(
      Array.isArray(body.symbols) ? body.symbols.map(String) : []
    );
    saveCronWatchlistOverride(symbols);
    return NextResponse.json({ ok: true, symbols });
  } catch {
    return NextResponse.json({ error: "Gecersiz istek." }, { status: 400 });
  }
}
