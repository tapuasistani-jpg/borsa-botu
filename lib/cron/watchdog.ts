import { getJsonKv, setJsonKv } from "@/lib/db/kv";
import { loadCronHeartbeat } from "@/lib/cron/telegram-state";
import { sendTelegramSystemMessage } from "@/lib/telegram/send";

const STALE_ALERT_KEY = "cron:last_stale_alert";
const ALERT_COOLDOWN_MS = 60 * 60 * 1000;

export interface WatchdogResult {
  ok: boolean;
  minutesSinceLastRun: number | null;
  alerted: boolean;
  status: "healthy" | "stale" | "missing";
}

export async function runCronWatchdog(): Promise<WatchdogResult> {
  const intervalMinutes = Number(process.env.CRON_INTERVAL_MINUTES) || 5;
  const staleMinutes =
    Number(process.env.CRON_STALE_MINUTES) || intervalMinutes * 3;

  const heartbeat = await loadCronHeartbeat();
  if (!heartbeat?.lastRunAt) {
    return {
      ok: true,
      minutesSinceLastRun: null,
      alerted: false,
      status: "missing",
    };
  }

  const minutesSinceLastRun = Math.round(
    (Date.now() - new Date(heartbeat.lastRunAt).getTime()) / 60000
  );

  if (minutesSinceLastRun <= staleMinutes) {
    return {
      ok: true,
      minutesSinceLastRun,
      alerted: false,
      status: "healthy",
    };
  }

  const lastAlert = await getJsonKv<string | null>(STALE_ALERT_KEY, null);
  const cooldownOk =
    !lastAlert ||
    Date.now() - new Date(lastAlert).getTime() > ALERT_COOLDOWN_MS;

  let alerted = false;
  if (cooldownOk) {
    const result = await sendTelegramSystemMessage(
      `⚠️ *Cron uyari*\n\nSon basarili tarama *${minutesSinceLastRun} dk* once.\nBeklenen aralik: ~${intervalMinutes} dk.\n\ncron-job.org ve Vercel loglarini kontrol et.`
    );
    if (result.ok) {
      await setJsonKv(STALE_ALERT_KEY, new Date().toISOString());
      alerted = true;
    }
  }

  return {
    ok: true,
    minutesSinceLastRun,
    alerted,
    status: "stale",
  };
}
