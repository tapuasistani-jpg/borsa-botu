import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  loadCronHeartbeat,
  upsertTradeLevelsCache,
} from "@/lib/cron/telegram-state";
import { isCronSecretConfigured } from "@/lib/cron/auth";
import { isTelegramConfigured } from "@/lib/telegram/send";
import { getDbMode, isTursoConfigured } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CRON_INTERVAL_MINUTES = Number(process.env.CRON_INTERVAL_MINUTES) || 5;
const HEALTH_GRACE_MINUTES = 3;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const heartbeat = await loadCronHeartbeat();
  const now = Date.now();
  let status: "active" | "delayed" | "missing" = "missing";
  let minutesSinceLastRun: number | null = null;

  if (heartbeat?.lastRunAt) {
    minutesSinceLastRun = Math.round(
      (now - new Date(heartbeat.lastRunAt).getTime()) / 60000
    );
    const threshold = CRON_INTERVAL_MINUTES + HEALTH_GRACE_MINUTES;
    status = minutesSinceLastRun <= threshold ? "active" : "delayed";
  }

  const productionUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://borsa-botu.vercel.app";
  const cronEndpoint = `${productionUrl}/api/cron/telegram`;

  return NextResponse.json({
    status,
    intervalMinutes: CRON_INTERVAL_MINUTES,
    minutesSinceLastRun,
    lastRunAt: heartbeat?.lastRunAt ?? null,
    lastAlertsSent: heartbeat?.alertsSent ?? 0,
    lastKapAlertsSent: heartbeat?.kapAlertsSent ?? 0,
    lastPriceAlertsSent: heartbeat?.priceAlertsSent ?? 0,
    telegramConfigured: isTelegramConfigured(),
    cronSecretConfigured: isCronSecretConfigured(),
    cronEndpoint,
    cronEndpointWithSecret: `${cronEndpoint}?secret=CRON_SECRET_DEGERIN`,
    storage: getDbMode(),
    tursoConfigured: isTursoConfigured(),
    setupHint:
      "Her 5 dk taranir; Telegram yalnizca sinyal degisince (GUCULU AL/SAT) ve yeni KAP/SL-TP icin gider.",
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      levels?: Record<
        string,
        { stopLoss: number; takeProfit: number } | undefined
      >;
    };

    const levels = body.levels ?? {};
    for (const [symbol, entry] of Object.entries(levels)) {
      if (
        entry &&
        Number.isFinite(entry.stopLoss) &&
        Number.isFinite(entry.takeProfit)
      ) {
        await upsertTradeLevelsCache(symbol, {
          stopLoss: entry.stopLoss,
          takeProfit: entry.takeProfit,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gecersiz istek." }, { status: 400 });
  }
}
