"use client";

import type { GlobalNewsResult } from "@/lib/stocks";
import { sentimentLabel } from "@/lib/news/combined-signal";

interface NewsBannerProps {
  globalNews: GlobalNewsResult | null;
  keywordBankSize: number;
  updatedAt: string;
}

function bannerClass(sentiment: string) {
  if (sentiment === "POSITIVE") return "news-banner news-banner-positive";
  if (sentiment === "NEGATIVE") return "news-banner news-banner-negative";
  if (sentiment === "RISKY") return "news-banner news-banner-risky";
  return "news-banner news-banner-neutral";
}

export default function NewsBanner({
  globalNews,
  keywordBankSize,
  updatedAt,
}: NewsBannerProps) {
  if (!globalNews) return null;

  const time = updatedAt
    ? (() => {
        const d = new Date(updatedAt);
        return Number.isNaN(d.getTime())
          ? updatedAt
          : d.toLocaleTimeString("tr-TR");
      })()
    : "—";

  return (
    <section className={bannerClass(globalNews.sentiment)}>
      <div className="news-banner-header">
        <div>
          <h2 className="news-banner-title">Kuresel Haber Analizi</h2>
          <p className="news-banner-subtitle">
            {keywordBankSize} kelimelik ucretsiz kural tabanli tarama · Trump ·
            Savas · BIST · Faiz
          </p>
        </div>
        <div className="news-banner-badge">
          {sentimentLabel(globalNews.sentiment)}
        </div>
      </div>

      <p className="news-banner-alert">{globalNews.alertMessage}</p>
      <p className="news-banner-summary">{globalNews.summary}</p>

      <div className="sentiment-bar-wrap banner-bar">
        <div className="sentiment-bar">
          {globalNews.positivePercent > 0 && (
            <span
              className="sentiment-seg seg-positive"
              style={{ width: `${globalNews.positivePercent}%` }}
            />
          )}
          {globalNews.negativePercent > 0 && (
            <span
              className="sentiment-seg seg-negative"
              style={{ width: `${globalNews.negativePercent}%` }}
            />
          )}
          {globalNews.riskyPercent > 0 && (
            <span
              className="sentiment-seg seg-risky"
              style={{ width: `${globalNews.riskyPercent}%` }}
            />
          )}
          {globalNews.neutralPercent > 0 && (
            <span
              className="sentiment-seg seg-neutral"
              style={{ width: `${globalNews.neutralPercent}%` }}
            />
          )}
        </div>
      </div>

      {globalNews.keywordsMatched.length > 0 && (
        <div className="news-keywords">
          {globalNews.keywordsMatched.slice(0, 10).map((kw) => (
            <span key={kw} className="news-keyword">
              {kw}
            </span>
          ))}
        </div>
      )}
      <p className="news-banner-time">Son guncelleme: {time}</p>
    </section>
  );
}
