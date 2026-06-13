"use client";

import type { SuccessScore } from "@/lib/signal-history";

interface SuccessScoreBadgeProps {
  score: SuccessScore;
}

export default function SuccessScoreBadge({ score }: SuccessScoreBadgeProps) {
  const hasData = score.total > 0;
  const colorClass =
    score.percent >= 60
      ? "success-high"
      : score.percent >= 40
        ? "success-mid"
        : "success-low";

  return (
    <div className={`success-score-badge ${hasData ? colorClass : ""}`}>
      <span className="success-score-label">Basari Skoru</span>
      <span className="success-score-value">
        {hasData ? `%${score.percent}` : "—"}
      </span>
      <span className="success-score-detail">
        {hasData
          ? `Son ${score.total} sinyal · ${score.wins} basarili`
          : "Sinyal verisi birikiyor..."}
      </span>
    </div>
  );
}
