"use client";

interface CronStatusData {
  status: "active" | "delayed" | "missing";
  intervalMinutes: number;
  minutesSinceLastRun: number | null;
  lastRunAt: string | null;
  lastAlertsSent: number;
  lastKapAlertsSent: number;
  lastPriceAlertsSent: number;
  telegramConfigured: boolean;
  cronSecretConfigured: boolean;
  cronEndpoint: string;
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
      </div>

      <div className="cron-counts">
        <span>Sinyal: {data.lastAlertsSent}</span>
        <span>KAP: {data.lastKapAlertsSent}</span>
        <span>SL/TP: {data.lastPriceAlertsSent}</span>
      </div>

      {!data.cronSecretConfigured && (
        <p className="cron-warn">CRON_SECRET tanimli degil.</p>
      )}
      {!data.telegramConfigured && (
        <p className="cron-warn">Telegram env degiskenleri eksik.</p>
      )}

      <details className="cron-setup">
        <summary>cron-job.org kurulumu (15 dk)</summary>
        <ol>
          <li>
            <a
              href="https://cron-job.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              cron-job.org
            </a>{" "}
            uzerinde yeni cron olustur
          </li>
          <li>URL: <code>{data.cronEndpoint}</code></li>
          <li>Schedule: Every 15 minutes</li>
          <li>
            Header: <code>Authorization: Bearer CRON_SECRET</code>
          </li>
          <li>Dashboard&apos;da &quot;Cron Senkron&quot; ile izleme listesini gonder</li>
        </ol>
      </details>
    </section>
  );
}

export type { CronStatusData };
