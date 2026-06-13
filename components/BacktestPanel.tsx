"use client";

import { useState } from "react";

interface BacktestResult {
  symbol: string;
  periodDays: number;
  totalTrades: number;
  winRate: number;
  strategyReturnPercent: number;
  buyHoldReturnPercent: number;
  strongBuyCount: number;
  strongSellCount: number;
  strongBuySuccessRate: number;
  strongSellSuccessRate: number;
  summary: string;
}

export default function BacktestPanel({ watchlist }: { watchlist: string[] }) {
  const [symbol, setSymbol] = useState(watchlist[0] ?? "THYAO");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BacktestResult | null>(null);

  async function runTest() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/backtest?symbol=${symbol}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Test basarisiz.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata olustu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel-section">
      <h2 className="section-title">Backtest (Son 6 Ay)</h2>
      <div className="panel-card">
        <p className="panel-desc">
          RSI + MACD + Bollinger + EMA kombinasyonunun gecmis performansini simule eder.
          Ucretsiz — gecmis veri TradingView&apos;dan cekilir.
        </p>
        <div className="backtest-controls">
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="portfolio-input"
          >
            {watchlist.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={runTest}
            disabled={loading}
          >
            {loading ? "Test calisiyor..." : "Backtest Calistir"}
          </button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {result && (
          <div className="backtest-results">
            <p className="backtest-summary">{result.summary}</p>
            <div className="backtest-grid">
              <div className="backtest-stat">
                <span className="stat-label">Strateji Getirisi</span>
                <span
                  className={
                    result.strategyReturnPercent >= 0 ? "pnl-pos" : "pnl-neg"
                  }
                >
                  {result.strategyReturnPercent >= 0 ? "+" : ""}
                  {result.strategyReturnPercent.toFixed(1)}%
                </span>
              </div>
              <div className="backtest-stat">
                <span className="stat-label">Al-Tut Getirisi</span>
                <span
                  className={
                    result.buyHoldReturnPercent >= 0 ? "pnl-pos" : "pnl-neg"
                  }
                >
                  {result.buyHoldReturnPercent >= 0 ? "+" : ""}
                  {result.buyHoldReturnPercent.toFixed(1)}%
                </span>
              </div>
              <div className="backtest-stat">
                <span className="stat-label">Islem Basarisi</span>
                <span>{result.winRate.toFixed(0)}%</span>
              </div>
              <div className="backtest-stat">
                <span className="stat-label">GUCULU AL Basarisi</span>
                <span>
                  {result.strongBuySuccessRate.toFixed(0)}% (
                  {result.strongBuyCount} sinyal)
                </span>
              </div>
              <div className="backtest-stat">
                <span className="stat-label">GUCULU SAT Basarisi</span>
                <span>
                  {result.strongSellSuccessRate.toFixed(0)}% (
                  {result.strongSellCount} sinyal)
                </span>
              </div>
              <div className="backtest-stat">
                <span className="stat-label">Toplam Islem</span>
                <span>{result.totalTrades}</span>
              </div>
            </div>
            <p className="panel-note">
              GUCULU AL/SAT sonrasi 5 gunluk fiyat hareketi ile basari olculur.
              Gecmis performans gelecek getiriyi garanti etmez.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
