import { NextResponse } from "next/server";
import {
  runTelegramCronJob,
  verifyCronSecret,
} from "@/lib/cron/telegram-runner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Yetkisiz cron istegi." }, { status: 401 });
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
