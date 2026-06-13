"use client";

import { getMarketStatus } from "@/lib/market-hours";

export default function MarketStatusBar() {
  const status = getMarketStatus();

  const sessionClass =
    status.session === "OPEN"
      ? "market-session-open"
      : status.session === "PRE_MARKET"
        ? "market-session-pre"
        : "market-session-closed";

  return (
    <div className={`market-status-bar ${sessionClass}`}>
      <span className="market-status-dot" />
      <span className="market-status-label">{status.label}</span>
      <span className="market-status-sep">·</span>
      <span className="market-status-detail">{status.detail}</span>
      <span className="market-status-sep">·</span>
      <span className="market-status-delay">{status.dataDelayLabel}</span>
    </div>
  );
}
