"use client";

import type { MarketOverview } from "@/lib/market-overview";

interface MarketOverviewPanelProps {
  overview: MarketOverview;
}

function riskClass(level: MarketOverview["riskLevel"]) {
  if (level === "HIGH") return "market-risk-high";
  if (level === "LOW") return "market-risk-low";
  return "market-risk-medium";
}

function trendClass(trend: string) {
  if (trend === "UP") return "sector-trend-up";
  if (trend === "DOWN") return "sector-trend-down";
  return "sector-trend-flat";
}

export default function MarketOverviewPanel({
  overview,
}: MarketOverviewPanelProps) {
  return (
    <section className="panel-card market-overview-panel">
      <div className="panel-header">
        <h2 className="panel-title">Piyasa Gorunumu</h2>
        <span className={`market-risk-badge ${riskClass(overview.riskLevel)}`}>
          {overview.riskLabel}
        </span>
      </div>

      <p className="market-summary">{overview.summary}</p>

      <div className="market-stats-row">
        <div className="market-stat">
          <span className="stat-label">Guclu</span>
          <span className="stat-value stat-up">{overview.bullishCount}</span>
        </div>
        <div className="market-stat">
          <span className="stat-label">Zayif</span>
          <span className="stat-value stat-down">{overview.bearishCount}</span>
        </div>
        <div className="market-stat">
          <span className="stat-label">Notr</span>
          <span className="stat-value">{overview.neutralCount}</span>
        </div>
        <div className="market-stat">
          <span className="stat-label">Ort. Degisim</span>
          <span
            className={`stat-value ${
              overview.avgMarketChange >= 0 ? "stat-up" : "stat-down"
            }`}
          >
            {overview.avgMarketChange >= 0 ? "+" : ""}
            {overview.avgMarketChange.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="sector-trend-grid">
        {overview.sectorRows.map((sector) => (
          <div key={sector.sectorId} className="sector-trend-chip">
            <span className="sector-name">{sector.name}</span>
            <span className={`sector-trend ${trendClass(sector.trend)}`}>
              {sector.trendLabel}
              <span className="sector-change">
                {sector.avgChangePercent >= 0 ? "+" : ""}
                {sector.avgChangePercent.toFixed(1)}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
