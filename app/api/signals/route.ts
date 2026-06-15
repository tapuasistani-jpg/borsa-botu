import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDbMode } from "@/lib/db/client";
import {
  getSignalSnapshot,
  syncSignals,
  type SignalSyncEntry,
} from "@/lib/signal-sync";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const { records, score } = await getSignalSnapshot();
  return NextResponse.json({
    records: [...records].sort((a, b) => b.timestamp - a.timestamp),
    score,
    storage: getDbMode(),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const prices = Array.isArray(body.prices) ? body.prices : [];
    const entries = Array.isArray(body.entries)
      ? (body.entries as SignalSyncEntry[])
      : [];

    const { records, score } = await syncSignals(prices, entries);

    return NextResponse.json({
      ok: true,
      records: [...records].sort((a, b) => b.timestamp - a.timestamp),
      score,
      storage: getDbMode(),
    });
  } catch {
    return NextResponse.json({ error: "Gecersiz istek." }, { status: 400 });
  }
}
