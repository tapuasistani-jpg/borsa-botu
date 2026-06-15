"use client";

import { useEffect } from "react";
import type { SignalRecord } from "@/lib/signal-history";
import {
  signalEnToTr,
  signalStatusLabel,
} from "@/lib/signal-history";

interface SignalHistoryModalProps {
  open: boolean;
  records: SignalRecord[];
  onClose: () => void;
}

function signalRowClass(signalEn: string): string {
  if (
    signalEn === "STRONG BUY" ||
    signalEn === "BUY" ||
    signalEn === "RISKY BUY"
  ) {
    return "log-signal-buy";
  }
  if (signalEn === "STRONG SELL" || signalEn === "SELL") {
    return "log-signal-sell";
  }
  return "log-signal-hold";
}

function statusClass(status: SignalRecord["status"]): string {
  if (status === "WIN") return "log-status-win";
  if (status === "LOSS") return "log-status-loss";
  return "log-status-open";
}

export default function SignalHistoryModal({
  open,
  records,
  onClose,
}: SignalHistoryModalProps) {
  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="signal-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="signal-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signal-modal-title"
      >
        <div className="signal-modal-header">
          <h2 id="signal-modal-title">Sinyal Gecmisi</h2>
          <button type="button" className="signal-modal-close" onClick={onClose}>
            Kapat
          </button>
        </div>

        {records.length === 0 ? (
          <p className="signal-modal-empty">
            Henuz kayitli sinyal yok. AL/SAT sinyalleri olustukca burada
            listelenecek.
          </p>
        ) : (
          <div className="signal-modal-table-wrap">
            <table className="signal-log-table">
              <thead>
                <tr>
                  <th>Hisse</th>
                  <th>Sinyal</th>
                  <th>Saat</th>
                  <th>Fiyat</th>
                  <th>Teknik Gerekce</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row.id}>
                    <td className="log-symbol">{row.symbol}</td>
                    <td>
                      <span
                        className={`log-signal-pill ${signalRowClass(row.signalEn)}`}
                      >
                        {row.signalTr ?? signalEnToTr(row.signalEn)}
                      </span>
                    </td>
                    <td className="log-time">
                      {new Date(row.timestamp).toLocaleString("tr-TR")}
                    </td>
                    <td className="log-price">{row.entryPrice.toFixed(2)} TL</td>
                    <td className="log-reason">
                      <span className="log-ta">{row.taSummary ?? "—"}</span>
                      {row.reason && (
                        <span className="log-detail">{row.reason}</span>
                      )}
                    </td>
                    <td>
                      <span className={`log-status ${statusClass(row.status)}`}>
                        {signalStatusLabel(row.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
