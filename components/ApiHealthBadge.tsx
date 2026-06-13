"use client";

import type { ApiHealthState } from "@/lib/api-health";
import { formatHealthTime } from "@/lib/api-health";

interface ApiHealthBadgeProps {
  health: ApiHealthState;
}

function statusClass(status: string) {
  if (status === "ok") return "health-ok";
  if (status === "error") return "health-error";
  return "health-warn";
}

export default function ApiHealthBadge({ health }: ApiHealthBadgeProps) {
  const overallLabel =
    health.overall === "ok"
      ? "Saglikli"
      : health.overall === "error"
        ? "Hata"
        : "Bekliyor";

  return (
    <div className={`api-health-badge ${statusClass(health.overall)}`}>
      <span className="api-health-title">API Sagligi · {overallLabel}</span>
      <div className="api-health-rows">
        {(["prices", "analysis", "news"] as const).map((key) => {
          const slice = health[key];
          return (
            <span key={key} className={`api-health-row ${statusClass(slice.status)}`}>
              {slice.label}: {formatHealthTime(slice.lastUpdate)}
              {slice.message ? ` (${slice.message})` : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}
