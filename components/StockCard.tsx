"use client";

import { useState } from "react";
import type {
  GlobalNewsResult,
  StockAnalysis,
  StockNewsResult,
} from "@/lib/stocks";
import { buildEnhancedSignal } from "@/lib/signal-engine";
import type { Bist100Comparison } from "@/lib/bist100";
import type { SectorId, SectorTrendInfo } from "@/lib/sectors";
import TradingViewWidget from "@/components/TradingViewWidget";
import {
  getSignalTone,
  signalStripClass,
  stockCardClass,
} from "@/lib/signal-display";

interface StockCardProps {
  symbol: string;
  price: number | null;
  changePercent?: number;
  analysis: StockAnalysis | null;
  stockNews: StockNewsResult | null;
  globalNews: GlobalNewsResult | null;
  sectorTrends: Record<SectorId, SectorTrendInfo>;
  bist100Comparison?: Bist100Comparison | null;
  bist100ChangePercent?: number | null;
}

function scoreLabel(score: number) {
  if (score > 0) return { text: "AL", className: "chip-bull" };
  if (score < 0) return { text: "SAT", className: "chip-bear" };
  return { text: "-", className: "chip-neutral" };
}

function alertClass(sentiment: string) {
  if (sentiment === "RISKY") return "news-alert news-alert-risky";
  if (sentiment === "POSITIVE") return "news-alert news-alert-positive";
  if (sentiment === "NEGATIVE") return "news-alert news-alert-negative";
  return "news-alert news-alert-neutral";
}

function sectorTrendClass(trend: string) {
  if (trend === "UP") return "sector-box-up";
  if (trend === "DOWN") return "sector-box-down";
  return "sector-box-flat";
}

export default function StockCard({
  symbol,
  price,
  changePercent,
  analysis,
  stockNews,
  globalNews,
  sectorTrends,
  bist100Comparison,
  bist100ChangePercent = null,
}: StockCardProps) {
  const { combined, tradeLevels, riskReward, sectorInfo } = buildEnhancedSignal(
    symbol,
    analysis,
    stockNews,
    globalNews,
    price,
    sectorTrends,
    { bist100ChangePercent }
  );

  const taSignal = analysis
    ? `${analysis.signalTr} (${analysis.signalEn})`
    : "—";

  const sentiment = stockNews?.sentiment ?? "NEUTRAL";
  const [showChart, setShowChart] = useState(false);

  const tone = getSignalTone(combined.signalEn);
  const stripClass = signalStripClass(tone, combined.signalEn);
  const isBuy = tone === "buy" || tone === "risky";
  const isSell = tone === "sell";

  return (
    <article className={stockCardClass(tone, combined.signalEn)}>
      <div className={stripClass}>
        <span
          className={`signal-strip-dot ${isBuy ? "dot-buy" : isSell ? "dot-sell" : "dot-hold"}`}
          aria-hidden
        />
        <span className="signal-strip-label">{combined.signalTr}</span>
        <span className="signal-strip-en">({combined.signalEn})</span>
      </div>

      <div className="stock-card-body">
      <div className="stock-card-header">
        <div>
          <div className="stock-symbol">{symbol}</div>
          <div className="stock-price">
            {price !== null ? `${price.toFixed(2)} TL` : "—"}
          </div>
          {changePercent !== undefined && price !== null && (
            <div className="stock-change">
              {changePercent >= 0 ? "+" : ""}
              {changePercent.toFixed(2)}%
            </div>
          )}
        </div>
      </div>

      {bist100Comparison && (
        <div
          className={`bist100-box bist100-${bist100Comparison.trend.toLowerCase()}`}
        >
          <span className="bist100-label">BIST100 Kiyas</span>
          <span className="bist100-value">{bist100Comparison.label}</span>
        </div>
      )}

      {sectorInfo && (
        <div className={`sector-info-box ${sectorTrendClass(sectorInfo.trend)}`}>
          <span className="sector-info-label">Sektor: {sectorInfo.sectorName}</span>
          <span className="sector-info-trend">
            {sectorInfo.trendLabel} ·{" "}
            {sectorInfo.avgChangePercent >= 0 ? "+" : ""}
            {sectorInfo.avgChangePercent.toFixed(1)}%
          </span>
        </div>
      )}

      {tradeLevels && price !== null && (
        <div className="trade-levels-box">
          <div className="trade-level-row">
            <span className="trade-level-label">Hedef Satis</span>
            <span className="trade-level-value trade-tp">
              {tradeLevels.takeProfit.toFixed(2)} TL
            </span>
          </div>
          <div className="trade-level-row">
            <span className="trade-level-label">Zarar Durdur</span>
            <span className="trade-level-value trade-sl">
              {tradeLevels.stopLoss.toFixed(2)} TL
            </span>
          </div>
          <div className="trade-level-row">
            <span className="trade-level-label">R/R Orani</span>
            <span className="trade-level-value">
              1:{tradeLevels.riskRewardRatio.toFixed(1)}
            </span>
          </div>
          <p className="trade-level-hint">SL/TP Telegram alarmi (cron + acik panel)</p>
        </div>
      )}

      <button
        type="button"
        className="btn-chart-toggle"
        onClick={() => setShowChart((v) => !v)}
      >
        {showChart ? "Grafigi Gizle" : "TradingView Grafigi"}
      </button>

      {showChart && <TradingViewWidget symbol={symbol} />}

      {riskReward && price !== null && (
        <div
          className={`risk-reward-box ${
            riskReward.passesThreshold ? "rr-pass" : "rr-fail"
          }`}
        >
          <span>Net Kar Potansiyeli: %{riskReward.netProfitPercent.toFixed(1)}</span>
          <span className="rr-detail">
            (Brut %{riskReward.grossProfitPercent.toFixed(1)} · Komisyon -%
            {riskReward.commissionPercent.toFixed(2)})
          </span>
        </div>
      )}

      {stockNews && (
        <div className={alertClass(sentiment)}>
          {stockNews.alertMessage}
        </div>
      )}

      {stockNews && (
        <div className="sentiment-bar-wrap">
          <div className="sentiment-bar">
            {stockNews.positivePercent > 0 && (
              <span
                className="sentiment-seg seg-positive"
                style={{ width: `${stockNews.positivePercent}%` }}
                title={`Pozitif %${stockNews.positivePercent}`}
              />
            )}
            {stockNews.negativePercent > 0 && (
              <span
                className="sentiment-seg seg-negative"
                style={{ width: `${stockNews.negativePercent}%` }}
                title={`Negatif %${stockNews.negativePercent}`}
              />
            )}
            {stockNews.riskyPercent > 0 && (
              <span
                className="sentiment-seg seg-risky"
                style={{ width: `${stockNews.riskyPercent}%` }}
                title={`Risk %${stockNews.riskyPercent}`}
              />
            )}
            {stockNews.neutralPercent > 0 && (
              <span
                className="sentiment-seg seg-neutral"
                style={{ width: `${stockNews.neutralPercent}%` }}
                title={`Notr %${stockNews.neutralPercent}`}
              />
            )}
          </div>
          <div className="sentiment-legend-mini">
            <span className="leg-pos">+{stockNews.positivePercent}%</span>
            <span className="leg-neg">-{stockNews.negativePercent}%</span>
            <span className="leg-risk">!{stockNews.riskyPercent}%</span>
          </div>
        </div>
      )}

      <div className="signal-breakdown">
        <div className="signal-row">
          <span className="signal-label">Teknik</span>
          <span className="signal-value">{taSignal}</span>
        </div>
        {stockNews && (
          <div className="signal-row">
            <span className="signal-label">Haber</span>
            <span className={`news-sentiment news-${sentiment.toLowerCase()}`}>
              {sentiment === "POSITIVE"
                ? "Pozitif"
                : sentiment === "NEGATIVE"
                  ? "Negatif"
                  : sentiment === "RISKY"
                    ? "Riskli"
                    : "Notr"}
            </span>
          </div>
        )}
      </div>

      {analysis && (
        <div className="indicator-row">
          {(
            [
              ["RSI", analysis.scores.rsi],
              ["MACD", analysis.scores.macd],
              ["BB", analysis.scores.bollinger],
              ["EMA", analysis.scores.ema],
            ] as const
          ).map(([name, score]) => {
            const chip = scoreLabel(score);
            return (
              <div key={name} className="indicator-chip">
                {name}
                <span className={chip.className}>{chip.text}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="ai-news-box">
        <div className="ai-news-title">Haber Analizi (Ucretsiz)</div>
        <p className="ai-news-text">
          {stockNews?.summary ?? "Haber analizi yukleniyor..."}
        </p>
        {stockNews && stockNews.matchedKeywords.length > 0 && (
          <div className="matched-keywords">
            {stockNews.matchedKeywords.slice(0, 5).map((kw) => (
              <span key={kw} className="matched-kw">
                {kw}
              </span>
            ))}
          </div>
        )}
        <p className="ai-news-reason">{combined.reason}</p>
      </div>
      </div>
    </article>
  );
}
