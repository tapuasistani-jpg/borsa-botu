import type { NewsArticle, NewsSentiment } from "./types";
import {
  KEYWORD_BANK,
  SORTED_KEYWORDS,
  type KeywordCategory,
} from "./keywords";

export interface MatchedKeyword {
  word: string;
  category: KeywordCategory;
  weight: number;
  tag?: string;
}

export interface SentimentAnalysisResult {
  sentiment: NewsSentiment;
  summary: string;
  alertMessage: string;
  positivePercent: number;
  negativePercent: number;
  riskyPercent: number;
  neutralPercent: number;
  matchedKeywords: MatchedKeyword[];
  scores: {
    positive: number;
    negative: number;
    risky: number;
  };
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function matchKeywords(text: string): MatchedKeyword[] {
  const normalized = normalizeText(text);
  const matched: MatchedKeyword[] = [];
  const usedRanges: [number, number][] = [];

  for (const kw of SORTED_KEYWORDS) {
    const needle = normalizeText(kw.word);
    let start = 0;

    while (start < normalized.length) {
      const idx = normalized.indexOf(needle, start);
      if (idx === -1) break;

      const end = idx + needle.length;
      const overlaps = usedRanges.some(
        ([s, e]) => !(end <= s || idx >= e)
      );

      if (!overlaps) {
        matched.push({
          word: kw.word,
          category: kw.category,
          weight: kw.weight,
          tag: kw.tag,
        });
        usedRanges.push([idx, end]);
      }

      start = idx + 1;
    }
  }

  return matched;
}

function sumWeights(matches: MatchedKeyword[], cat: KeywordCategory): number {
  return matches
    .filter((m) => m.category === cat)
    .reduce((acc, m) => acc + m.weight, 0);
}

function buildAlertMessage(
  sentiment: NewsSentiment,
  percents: { positive: number; negative: number; risky: number; neutral: number },
  matches: MatchedKeyword[]
): string {
  const riskyTags = [
    ...new Set(matches.filter((m) => m.category === "RISKY" && m.tag).map((m) => m.tag!)),
  ];

  if (sentiment === "RISKY") {
    if (riskyTags.some((t) => ["Savas", "Fuze", "Nukleer", "Saldirı", "Bombardiman"].includes(t))) {
      return "⚠️ Savas Riski Algilandi";
    }
    if (riskyTags.includes("Trump")) {
      return "⚠️ Trump / Tarife Riski Algilandi";
    }
    if (riskyTags.some((t) => ["Kriz", "Resesyon", "Iflas", "Cokus"].includes(t))) {
      return "⚠️ Ekonomik Kriz Riski Algilandi";
    }
    if (riskyTags.some((t) => ["Gerginlik", "Jeopolitik", "Yaptirim"].includes(t))) {
      return "⚠️ Jeopolitik Gerginlik Algilandi";
    }
    return `⚠️ Yuksek Risk Algilandi (%${percents.risky})`;
  }

  if (sentiment === "POSITIVE") {
    return `Haber Duyarliligi: %${percents.positive} Pozitif`;
  }

  if (sentiment === "NEGATIVE") {
    return `Haber Duyarliligi: %${percents.negative} Negatif`;
  }

  return `Haber Duyarliligi: Notr (%${percents.neutral} notr)`;
}

function buildSummary(
  sentiment: NewsSentiment,
  articles: NewsArticle[],
  matches: MatchedKeyword[]
): string {
  const top = articles[0]?.title ?? "";
  const short = top.length > 85 ? `${top.slice(0, 82)}...` : top;
  const topKeywords = [...new Set(matches.slice(0, 4).map((m) => m.word))].join(", ");

  if (!short) {
    return "Ilgili haber bulunamadi. Teknik analize guvenin.";
  }

  const kwPart = topKeywords ? ` [${topKeywords}]` : "";

  const prefix: Record<NewsSentiment, string> = {
    RISKY: "Risk sinyali:",
    POSITIVE: "Olumlu haber:",
    NEGATIVE: "Olumsuz haber:",
    NEUTRAL: "Notr haber:",
  };

  return `${prefix[sentiment]} ${short}${kwPart}`;
}

export function analyzeSentimentRuleBased(
  articles: NewsArticle[]
): SentimentAnalysisResult {
  const empty: SentimentAnalysisResult = {
    sentiment: "NEUTRAL",
    summary: "Ilgili haber bulunamadi. Teknik analize guvenin.",
    alertMessage: "Haber Duyarliligi: Veri yok",
    positivePercent: 0,
    negativePercent: 0,
    riskyPercent: 0,
    neutralPercent: 100,
    matchedKeywords: [],
    scores: { positive: 0, negative: 0, risky: 0 },
  };

  if (articles.length === 0) return empty;

  const combined = articles.map((a) => a.title).join(" ");
  const matched = matchKeywords(combined);

  const posScore = sumWeights(matched, "POSITIVE");
  const negScore = sumWeights(matched, "NEGATIVE");
  const riskScore = sumWeights(matched, "RISKY");

  const rawTotal = posScore + negScore + riskScore;
  const baseNeutral = rawTotal === 0 ? 4 : Math.max(1, Math.ceil(rawTotal * 0.15));
  const total = rawTotal + baseNeutral;

  const positivePercent = Math.round((posScore / total) * 100);
  const negativePercent = Math.round((negScore / total) * 100);
  const riskyPercent = Math.round((riskScore / total) * 100);
  const neutralPercent = Math.max(
    0,
    100 - positivePercent - negativePercent - riskyPercent
  );

  const percents = {
    positive: positivePercent,
    negative: negativePercent,
    risky: riskyPercent,
    neutral: neutralPercent,
  };

  let sentiment: NewsSentiment = "NEUTRAL";

  if (riskScore >= 4 || (riskScore >= 3 && negScore >= 2) || (riskScore >= 2 && negScore >= 3)) {
    sentiment = "RISKY";
  } else if (riskScore >= 3) {
    sentiment = "RISKY";
  } else if (posScore > negScore + 2 && riskScore <= 1) {
    sentiment = "POSITIVE";
  } else if (negScore > posScore + 2 && riskScore <= 2) {
    sentiment = "NEGATIVE";
  } else if (positivePercent >= 45 && positivePercent > negativePercent + 15) {
    sentiment = "POSITIVE";
  } else if (negativePercent >= 45 && negativePercent > positivePercent + 15) {
    sentiment = "NEGATIVE";
  } else if (riskyPercent >= 35) {
    sentiment = "RISKY";
  }

  const alertMessage = buildAlertMessage(sentiment, percents, matched);
  const summary = buildSummary(sentiment, articles, matched);

  return {
    sentiment,
    summary,
    alertMessage,
    positivePercent,
    negativePercent,
    riskyPercent,
    neutralPercent,
    matchedKeywords: matched,
    scores: { positive: posScore, negative: negScore, risky: riskScore },
  };
}

export function getKeywordBankSize(): number {
  return KEYWORD_BANK.length;
}
