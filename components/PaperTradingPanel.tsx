"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatMoneyTL,
  formatSignedMoneyTL,
} from "@/lib/portfolio";

interface PaperPosition {
  symbol: string;
  quantity: number;
  avgPrice: number;
}

interface PaperTrade {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  signalTr?: string;
  createdAt: string;
}

interface PaperData {
  account: { cash: number; initialCash: number; enabled: boolean };
  positions: PaperPosition[];
  trades: PaperTrade[];
}

interface PaperTradingPanelProps {
  prices: { symbol: string; price: number | null }[];
}

export default function PaperTradingPanel({ prices }: PaperTradingPanelProps) {
  const [data, setData] = useState<PaperData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchPaper = useCallback(async () => {
    try {
      const res = await fetch("/api/paper");
      if (!res.ok) return;
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPaper();
  }, [fetchPaper]);

  const totals = useMemo(() => {
    if (!data) return null;
    let positionsValue = 0;
    for (const pos of data.positions) {
      const live =
        prices.find((p) => p.symbol === pos.symbol)?.price ?? pos.avgPrice;
      positionsValue += pos.quantity * live;
    }
    const equity = data.account.cash + positionsValue;
    const pnlTl = equity - data.account.initialCash;
    const pnlPercent =
      data.account.initialCash > 0
        ? (pnlTl / data.account.initialCash) * 100
        : 0;
    return { positionsValue, equity, pnlTl, pnlPercent };
  }, [data, prices]);

  async function postAction(action: string, extra?: Record<string, unknown>) {
    setMessage("");
    const res = await fetch("/api/paper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    if (!res.ok) {
      setMessage("Islem basarisiz.");
      return;
    }
    const json = await res.json();
    setData(json);
    setMessage(
      action === "reset"
        ? "Sanal hesap sifirlandi (100.000 TL)."
        : action === "toggle"
          ? json.account.enabled
            ? "Otomatik paper trade acik."
            : "Otomatik paper trade kapali."
          : "Guncellendi."
    );
  }

  if (loading) {
    return (
      <section className="panel-section">
        <h2 className="section-title">Paper Trading</h2>
        <div className="panel-card">
          <p className="panel-empty">Yukleniyor...</p>
        </div>
      </section>
    );
  }

  if (!data || !totals) {
    return (
      <section className="panel-section">
        <h2 className="section-title">Paper Trading</h2>
        <div className="panel-card">
          <p className="panel-empty">Veri alinamadi.</p>
        </div>
      </section>
    );
  }

  const pnlClass = totals.pnlTl >= 0 ? "pnl-pos" : "pnl-neg";

  return (
    <section className="panel-section">
      <h2 className="section-title">Paper Trading</h2>
      <div className="panel-card paper-panel">
        <div className="paper-panel-header">
          <p className="panel-desc">
            Sinyal degisince otomatik sanal al/sat (100.000 TL baslangic)
          </p>
          <label className="paper-toggle">
            <input
              type="checkbox"
              checked={data.account.enabled}
              onChange={(e) =>
                void postAction("toggle", { enabled: e.target.checked })
              }
            />
            Otomatik
          </label>
        </div>

        <div className="paper-stats">
          <div className="paper-stat">
            <span>Nakit</span>
            <strong>{formatMoneyTL(data.account.cash)}</strong>
          </div>
          <div className="paper-stat">
            <span>Hisse</span>
            <strong>{formatMoneyTL(totals.positionsValue)}</strong>
          </div>
          <div className="paper-stat">
            <span>Toplam</span>
            <strong>{formatMoneyTL(totals.equity)}</strong>
          </div>
          <div className={`paper-stat ${pnlClass}`}>
            <span>K/Z</span>
            <strong>
              {formatSignedMoneyTL(totals.pnlTl)} ({totals.pnlPercent >= 0 ? "+" : ""}
              {totals.pnlPercent.toFixed(2)}%)
            </strong>
          </div>
        </div>

        {data.positions.length > 0 && (
          <div className="paper-positions">
            <h4 className="paper-subtitle">Acik Pozisyonlar</h4>
            <ul className="paper-list">
              {data.positions.map((pos) => {
                const live =
                  prices.find((p) => p.symbol === pos.symbol)?.price ??
                  pos.avgPrice;
                const pnl = (live - pos.avgPrice) * pos.quantity;
                return (
                  <li key={pos.symbol}>
                    <strong>{pos.symbol}</strong> · {pos.quantity} lot ·{" "}
                    {pos.avgPrice.toFixed(2)} TL
                    <span className={pnl >= 0 ? "pnl-pos" : "pnl-neg"}>
                      {" "}
                      · {formatSignedMoneyTL(pnl)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {data.trades.length > 0 && (
          <div className="paper-trades">
            <h4 className="paper-subtitle">Son Islemler</h4>
            <ul className="paper-list">
              {data.trades.slice(0, 6).map((t) => (
                <li key={t.id}>
                  <span className={t.side === "BUY" ? "pnl-pos" : "pnl-neg"}>
                    {t.side === "BUY" ? "AL" : "SAT"}
                  </span>{" "}
                  {t.symbol} · {t.quantity} @ {t.price.toFixed(2)} TL
                  {t.signalTr ? ` · ${t.signalTr}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="paper-actions">
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => void postAction("reset")}
          >
            Sifirla
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => void fetchPaper()}
          >
            Yenile
          </button>
        </div>

        {message && <p className="panel-note">{message}</p>}
      </div>
    </section>
  );
}
