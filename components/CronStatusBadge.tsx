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
  cronEndpointWithSecret?: string;
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
        <p className="cron-warn">
          CRON_SECRET Vercel&apos;de tanimli degil (Production env).
        </p>
      )}
      {!data.telegramConfigured && (
        <p className="cron-warn">Telegram env degiskenleri eksik.</p>
      )}

      <p className="cron-warn cron-warn-info">{data.setupHint}</p>

      <details className="cron-setup">
        <summary>cron-job.org kurulumu (401 cozumu)</summary>
        <ol>
          <li>
            <strong>URL (preview degil, production):</strong>
            <br />
            <code>{data.cronEndpoint}</code>
          </li>
          <li>
            Preview linki kullanma (
            <code>*-projects.vercel.app</code> → 401 verir)
          </li>
          <li>
            <strong>Tum izleme listesi</strong> her calismada taranir (rotasyon yok)
          </li>
          <li>Schedule: Every 5 minutes (onerilen) · Method: GET</li>
          <li>
            <strong>Yontem A — Header (onerilen):</strong>
            <br />
            Name: <code>Authorization</code>
            <br />
            Value: <code>Bearer .env.local icindeki CRON_SECRET</code>
          </li>
          <li>
            <strong>Yontem B — URL parametresi (header zor ise):</strong>
            <br />
            <code>{data.cronEndpointWithSecret ?? `${data.cronEndpoint}?secret=...`}</code>
          </li>
          <li>
            Vercel → Settings → Environment Variables →{" "}
            <code>CRON_SECRET</code> (Production) → Redeploy
          </li>
          <li>Dashboard&apos;da Cron Senkron</li>
        </ol>
      </details>
    </section>
  );
}

export type { CronStatusData };
