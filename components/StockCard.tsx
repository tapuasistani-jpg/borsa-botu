"use client";

import type {
  CombinedSignal,
  GlobalNewsResult,
  StockAnalysis,
  StockNewsResult,
} from "@/lib/stocks";
import { combineTaAndNews, sentimentLabel } from "@/lib/news/combined-signal";

interface StockCardProps {
  symbol: string;
  price: number | null;
  changePercent?: number;
  analysis: StockAnalysis | null;
  stockNews: StockNewsResult | null;
  globalNews: GlobalNewsResult | null;
}

function scoreLabel(score: number) {
  if (score > 0) return { text: "AL", className: "chip-bull" };
  if (score < 0) return { text: "SAT", className: "chip-bear" };
  return { text: "-", className: "chip-neutral" };
}

function combinedSignalClass(color: CombinedSignal["color"]) {
  if (color === "green") return "signal-badge signal-green";
  if (color === "red") return "signal-badge signal-red";
  if (color === "orange") return "signal-badge signal-orange";
  return "signal-badge signal-yellow";
}

function alertClass(sentiment: string) {
  if (sentiment === "RISKY") return "news-alert news-alert-risky";
  if (sentiment === "POSITIVE") return "news-alert news-alert-positive";
  if (sentiment === "NEGATIVE") return "news-alert news-alert-negative";
  return "news-alert news-alert-neutral";
}

export default function StockCard({
  symbol,
  price,
  changePercent,
  analysis,
  stockNews,
  globalNews,
}: StockCardProps) {
  const combined: CombinedSignal = combineTaAndNews(
    analysis,
    stockNews,
    globalNews
  );

  const taSignal = analysis
    ? `${analysis.signalTr} (${analysis.signalEn})`
    : "—";

  const sentiment = stockNews?.sentiment ?? "NEUTRAL";

  return (
    <article className="stock-card">
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
        <span className={combinedSignalClass(combined.color)}>
          {combined.signalTr}
          <span style={{ opacity: 0.75, marginLeft: 4, fontWeight: 400 }}>
            ({combined.signalEn})
          </span>
        </span>
      </div>

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
              {sentimentLabel(stockNews.sentiment)}
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
    </article>
  );
}
