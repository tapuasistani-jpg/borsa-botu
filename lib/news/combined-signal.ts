import type { StockAnalysis, SignalColor } from "@/lib/stocks";
import type {
  CombinedSignal,
  CombinedSignalEn,
  GlobalNewsResult,
  NewsSentiment,
  StockNewsResult,
} from "./types";

function isTaBullish(ta: StockAnalysis): boolean {
  return ta.totalScore >= 3;
}

function isTaBearish(ta: StockAnalysis): boolean {
  return ta.totalScore <= -3;
}

function isTaStrongBullish(ta: StockAnalysis): boolean {
  return ta.totalScore === 4;
}

function isTaStrongBearish(ta: StockAnalysis): boolean {
  return ta.totalScore === -4;
}

function effectiveSentiment(
  stock: NewsSentiment,
  global: NewsSentiment
): NewsSentiment {
  if (stock === "RISKY" || global === "RISKY") return "RISKY";
  if (stock === "NEGATIVE" || global === "NEGATIVE") {
    if (stock === "POSITIVE" || global === "POSITIVE") return "NEUTRAL";
    return "NEGATIVE";
  }
  if (stock === "POSITIVE" || global === "POSITIVE") return "POSITIVE";
  return "NEUTRAL";
}

export function combineTaAndNews(
  ta: StockAnalysis | null,
  stockNews: StockNewsResult | null,
  globalNews: GlobalNewsResult | null
): CombinedSignal {
  if (!ta) {
    return {
      signalEn: "NEUTRAL",
      signalTr: "BEKLE",
      color: "yellow",
      reason: "Teknik analiz henuz hazir degil.",
    };
  }

  const stockSent = stockNews?.sentiment ?? "NEUTRAL";
  const globalSent = globalNews?.sentiment ?? "NEUTRAL";
  const news = effectiveSentiment(stockSent, globalSent);

  // Haber riski + teknik AL -> RISKY BUY veya HOLD
  if (news === "RISKY") {
    if (isTaBullish(ta)) {
      return {
        signalEn: "RISKY BUY",
        signalTr: "RISKLI AL",
        color: "orange",
        reason: "Teknik AL diyor ama haberlerde savas/jeopolitik veya sistemik risk var.",
      };
    }
    if (isTaBearish(ta)) {
      return {
        signalEn: "STRONG SELL",
        signalTr: "GUCULU SAT",
        color: "red",
        reason: "Hem teknik hem haberler satis yonunde.",
      };
    }
    return {
      signalEn: "HOLD",
      signalTr: "DUR",
      color: "yellow",
      reason: "Haberlerde yuksek risk algisi — beklemede kal.",
    };
  }

  // Olumsuz haber + teknik AL -> DUR
  if (news === "NEGATIVE" && isTaBullish(ta)) {
    return {
      signalEn: "HOLD",
      signalTr: "DUR",
      color: "yellow",
      reason: "Teknik AL sinyali var ama haber akisi olumsuz.",
    };
  }

  // Olumlu haber + teknik AL -> guclendir
  if (news === "POSITIVE" && isTaBullish(ta)) {
    return {
      signalEn: isTaStrongBullish(ta) ? "STRONG BUY" : "BUY",
      signalTr: isTaStrongBullish(ta) ? "GUCULU AL" : "AL",
      color: "green",
      reason: "Teknik ve haberler uyumlu — alis yonu destekleniyor.",
    };
  }

  // Olumsuz haber + teknik SAT -> guclendir
  if (news === "NEGATIVE" && isTaBearish(ta)) {
    return {
      signalEn: isTaStrongBearish(ta) ? "STRONG SELL" : "SELL",
      signalTr: isTaStrongBearish(ta) ? "GUCULU SAT" : "SAT",
      color: "red",
      reason: "Teknik ve haberler uyumlu — satis yonu destekleniyor.",
    };
  }

  // Olumlu haber + teknik SAT -> celiski, bekle
  if (news === "POSITIVE" && isTaBearish(ta)) {
    return {
      signalEn: "HOLD",
      signalTr: "DUR",
      color: "yellow",
      reason: "Haberler olumlu ama teknik analiz sat diyor — celiski var.",
    };
  }

  // Varsayilan: teknik analiz karari
  const colorMap: Record<string, SignalColor | "orange"> = {
    green: "green",
    yellow: "yellow",
    red: "red",
  };

  return {
    signalEn: ta.signalEn as CombinedSignalEn,
    signalTr: ta.signalTr,
    color: colorMap[ta.color] ?? "yellow",
    reason: "Haberler notr — karar teknik analize dayaniyor.",
  };
}

export function sentimentLabel(s: NewsSentiment): string {
  const map: Record<NewsSentiment, string> = {
    POSITIVE: "Pozitif",
    NEGATIVE: "Negatif",
    RISKY: "Riskli",
    NEUTRAL: "Notr",
  };
  return map[s];
}

export function sentimentColor(s: NewsSentiment): string {
  const map: Record<NewsSentiment, string> = {
    POSITIVE: "var(--green)",
    NEGATIVE: "var(--red)",
    RISKY: "var(--orange)",
    NEUTRAL: "var(--text-muted)",
  };
  return map[s];
}
