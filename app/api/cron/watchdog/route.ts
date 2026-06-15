import { NextResponse } from "next/server";
import { runCronWatchdog } from "@/lib/cron/watchdog";
import {
  cronAuthHint,
  isCronSecretConfigured,
  verifyCronSecret,
} from "@/lib/cron/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

/** Cron saglik kontrolu — cron-job.org'da 10 dk'da bir ayarla */
export async function GET(request: Request) {
  if (!isCronSecretConfigured()) {
    return NextResponse.json(
      { error: "CRON_SECRET tanimli degil." },
      { status: 503 }
    );
  }

  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: "Yetkisiz.", hint: cronAuthHint() },
      { status: 401 }
    );
  }

  const result = await runCronWatchdog();
  return NextResponse.json(result);
}
