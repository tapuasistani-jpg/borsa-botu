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

  const modalRecords =
    records.length > 0 ? records.slice(0, 30) : getSignalLog(30);

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
        records={modalRecords}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
