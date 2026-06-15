"use client";

import { useCallback, useState } from "react";
import type { SuccessScore } from "@/lib/signal-history";
import { getSignalLog } from "@/lib/signal-history";
import SignalHistoryModal from "@/components/SignalHistoryModal";

interface SuccessScoreBadgeProps {
  score: SuccessScore;
}

export default function SuccessScoreBadge({ score }: SuccessScoreBadgeProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const hasData = score.total > 0;
  const colorClass =
    score.percent >= 60
      ? "success-high"
      : score.percent >= 40
        ? "success-mid"
        : "success-low";

  const openModal = useCallback(() => {
    setModalOpen(true);
  }, []);

  return (
    <>
      <button
        type="button"
        className={`success-score-badge success-score-clickable ${hasData ? colorClass : ""}`}
        onClick={openModal}
        title="Sinyal gecmisini ac"
      >
        <span className="success-score-label">Basari Skoru</span>
        <span className="success-score-value">
          {hasData ? `%${score.percent}` : "—"}
        </span>
        <span className="success-score-detail">
          {hasData
            ? `Son ${score.total} sinyal · ${score.wins} basarili · Detay icin tikla`
            : "Sinyal verisi birikiyor... · Gecmis icin tikla"}
        </span>
      </button>

      <SignalHistoryModal
        open={modalOpen}
        records={getSignalLog(30)}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
