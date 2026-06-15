"use client";

import { useCallback, useState } from "react";
import type { SignalRecord, SuccessScore } from "@/lib/signal-history";
import { getSignalLog } from "@/lib/signal-history";
import SignalHistoryModal from "@/components/SignalHistoryModal";

interface SuccessScoreBadgeProps {
  score: SuccessScore;
  records?: SignalRecord[];
}

export default function SuccessScoreBadge({
  score,
  records = [],
}: SuccessScoreBadgeProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const hasEvaluated = score.total > 0;
  const hasOpen = score.open > 0;
  const hasAny = hasEvaluated || hasOpen;
  const colorClass =
    score.percent >= 60
      ? "success-high"
      : score.percent >= 40
        ? "success-mid"
        : "success-low";

  const openModal = useCallback(() => {
    setModalOpen(true);
  }, []);

  const modalRecords =
    records.length > 0 ? records.slice(0, 30) : getSignalLog(30);

  return (
    <>
      <button
        type="button"
        className={`success-score-badge success-score-clickable ${hasEvaluated ? colorClass : hasOpen ? "success-pending" : ""}`}
        onClick={openModal}
        title="Sinyal gecmisini ac"
      >
        <span className="success-score-label">Basari Skoru</span>
        <span className="success-score-value">
          {hasEvaluated
            ? `%${score.percent}`
            : hasOpen
              ? "Takipte"
              : "—"}
        </span>
        <span className="success-score-detail">
          {hasEvaluated
            ? `Son ${score.total} sinyal · ${score.wins} basarili · Detay icin tikla`
            : hasOpen
              ? `${score.open} acik sinyal · Sonuc bekleniyor · Detay icin tikla`
              : "Sinyal verisi birikiyor... · Gecmis icin tikla"}
        </span>
      </button>

      <SignalHistoryModal
        open={modalOpen}
        records={modalRecords}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
