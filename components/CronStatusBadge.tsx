"use client";

interface CronStatusData {
  status: "active" | "delayed" | "missing";
  intervalMinutes: number;
  minutesSinceLastRun: number | null;
  lastRunAt: string | null;
  lastRunMode?: "full" | "lightweight" | null;
  lastAlertsSent: number;
  lastKapAlertsSent: number;
  lastPriceAlertsSent: number;
  telegramConfigured: boolean;
  cronSecretConfigured: boolean;
  cronEndpoint: string;
  watchdogEndpoint?: string;
  cronEndpointWithSecret?: string;
  watchdogEndpointWithSecret?: string;
  storage?: string;
  tursoConfigured?: boolean;
  telegramSignalMode?: string;
  setupHint: string;
}

interface CronStatusBadgeProps {
  data: CronStatusData | null;
  loading?: boolean;
}

function statusLabel(status: CronStatusData["status"]) {
  if (status === "active") return "Cron Aktif";
  if (status === "delayed") return "Cron Gecikmeli";
  return "Cron Bekleniyor";
}

function statusClass(status: CronStatusData["status"]) {
  if (status === "active") return "cron-status cron-active";
  if (status === "delayed") return "cron-status cron-delayed";
  return "cron-status cron-missing";
}

export default function CronStatusBadge({
  data,
  loading,
}: CronStatusBadgeProps) {
  if (loading || !data) {
    return <div className="cron-panel cron-panel-loading">Cron durumu...</div>;
  }

  const lastRunText = data.lastRunAt
    ? new Date(data.lastRunAt).toLocaleString("tr-TR")
    : "Henuz calisma kaydi yok";

  return (
    <section className="cron-panel">
      <div className="cron-panel-header">
        <span className={statusClass(data.status)}>{statusLabel(data.status)}</span>
        <span className="cron-interval">Her {data.intervalMinutes} dk</span>
      </div>

      <div className="cron-meta">
        <span>Son calisma: {lastRunText}</span>
        {data.minutesSinceLastRun !== null && (
          <span>({data.minutesSinceLastRun} dk once)</span>
        )}
        {data.lastRunMode && (
          <span>
            · Mod: {data.lastRunMode === "lightweight" ? "Hafif" : "Tam tarama"}
          </span>
        )}
      </div>

      <div className="cron-counts">
        <span>Sinyal: {data.lastAlertsSent}</span>
        <span>KAP: {data.lastKapAlertsSent}</span>
        <span>SL/TP: {data.lastPriceAlertsSent}</span>
        {data.storage && (
          <span>DB: {data.tursoConfigured ? "Turso" : data.storage}</span>
        )}
      </div>

      {!data.tursoConfigured && (
        <p className="cron-warn">Turso baglantisi yok — veri kaybolabilir.</p>
      )}
      {!data.cronSecretConfigured && (
        <p className="cron-warn">
          CRON_SECRET Vercel&apos;de tanimli degil (Production env).
        </p>
      )}
      {!data.telegramConfigured && (
        <p className="cron-warn">Telegram env degiskenleri eksik.</p>
      )}

      <p className="cron-warn cron-warn-info">{data.setupHint}</p>

      <details className="cron-setup">
        <summary>cron-job.org kurulumu</summary>
        <ol>
          <li>
            <strong>Ana cron (5 dk):</strong>
            <br />
            <code>{data.cronEndpoint}</code>
          </li>
          <li>
            <strong>Watchdog (10 dk — cron olum alarmi):</strong>
            <br />
            <code>{data.watchdogEndpoint ?? "/api/cron/watchdog"}</code>
          </li>
          <li>Method: GET · Header: Authorization Bearer CRON_SECRET</li>
          <li>
            Telegram modu: <strong>{data.telegramSignalMode ?? "AL/SAT"}</strong>{" "}
            (TELEGRAM_SIGNAL_MODE=strong ile sadece GUCULU)
          </li>
          <li>Piyasa kapali: hafif mod (SL/TP + skor guncelleme)</li>
          <li>
            <strong>URL alternatif:</strong>
            <br />
            <code>{data.cronEndpointWithSecret ?? `${data.cronEndpoint}?secret=...`}</code>
          </li>
          <li>Dashboard&apos;da Cron Senkron</li>
        </ol>
      </details>
    </section>
  );
}

export type { CronStatusData };
