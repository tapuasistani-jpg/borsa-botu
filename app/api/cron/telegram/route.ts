import { NextResponse } from "next/server";
import {
  runTelegramCronJob,
} from "@/lib/cron/telegram-runner";
import {
  cronAuthHint,
  isCronSecretConfigured,
  verifyCronSecret,
} from "@/lib/cron/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET(request: Request) {
  if (!isCronSecretConfigured()) {
    return NextResponse.json(
      {
        error: "CRON_SECRET Vercel ortam degiskenlerinde tanimli degil.",
        hint: "Vercel → Settings → Environment Variables → CRON_SECRET (Production)",
      },
      { status: 503 }
    );
  }

  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      {
        error: "Yetkisiz cron istegi (401).",
        hint: cronAuthHint(),
      },
      { status: 401 }
    );
  }

  try {
    const result = await runTelegramCronJob();
    if (!result.ok) {
      return NextResponse.json(result, { status: 503 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cron calistirilamadi.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
