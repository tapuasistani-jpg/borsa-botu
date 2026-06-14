"use client";

import type { MacroSnapshot } from "@/lib/macro";

interface MacroPanelProps {
  macro: MacroSnapshot | null;
  loading?: boolean;
}

function fmt(value: number | null, digits = 2, suffix = "") {
  if (value === null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}${suffix}`;
}

export default function MacroPanel({ macro, loading }: MacroPanelProps) {
  return (
    <section className="macro-panel">
      <div className="macro-panel-header">
        <h2 className="section-title section-title-inline">Makro Ozet</h2>
        {macro?.updatedAt && (
          <span className="macro-updated">
            {new Date(macro.updatedAt).toLocaleTimeString("tr-TR")}
          </span>
        )}
      </div>

      <div className="macro-grid">
        <div className="macro-card">
          <span className="macro-label">USD/TRY</span>
          <span className="macro-value">
            {loading ? "..." : macro?.usdTry?.toFixed(4) ?? "—"}
          </span>
          <span
            className={`macro-change ${
              (macro?.usdTryChangePercent ?? 0) >= 0 ? "up" : "down"
            }`}
          >
            {loading ? "" : fmt(macro?.usdTryChangePercent ?? null, 2, "%")}
          </span>
        </div>

        <div className="macro-card">
          <span className="macro-label">BIST100</span>
          <span className="macro-value">
            {loading ? "..." : fmt(macro?.bist100ChangePercent ?? null, 2, "%")}
          </span>
          <span className="macro-sub">Gunluk degisim</span>
        </div>

        <div className="macro-card">
          <span className="macro-label">Politika Faizi</span>
          <span className="macro-value">
            {loading
              ? "..."
              : macro?.policyRatePercent != null
                ? `%${macro.policyRatePercent.toFixed(2)}`
                : "—"}
          </span>
          <span className="macro-sub">
            {macro?.policyRateSource === "tcmb"
              ? "TCMB"
              : macro?.policyRateSource === "env"
                ? "Env"
                : "TCMB / env"}
          </span>
        </div>
      </div>
    </section>
  );
}
