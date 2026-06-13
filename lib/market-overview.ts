import type { GlobalNewsResult, StockAnalysis } from "./stocks";
import type { SectorId, SectorTrend, SectorTrendInfo } from "./sectors";

export type MarketRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface MarketOverview {
  riskLevel: MarketRiskLevel;
  riskLabel: string;
  summary: string;
  sectorRows: {
    sectorId: SectorId;
    name: string;
    trend: SectorTrend;
    trendLabel: string;
    avgChangePercent: number;
  }[];
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  avgMarketChange: number;
}

function riskFromGlobalNews(
  globalNews: GlobalNewsResult | null
): { level: MarketRiskLevel; label: string } {
  if (!globalNews) {
    return { level: "MEDIUM", label: "Orta Risk" };
  }

  if (globalNews.sentiment === "RISKY" || globalNews.riskyPercent >= 40) {
    return { level: "HIGH", label: "Yuksek Risk" };
  }
  if (
    globalNews.sentiment === "NEGATIVE" ||
    globalNews.negativePercent >= 35
  ) {
    return { level: "MEDIUM", label: "Orta Risk" };
  }
  if (globalNews.sentiment === "POSITIVE" && globalNews.positivePercent >= 40) {
    return { level: "LOW", label: "Dusuk Risk" };
  }
  return { level: "MEDIUM", label: "Orta Risk" };
}

export function buildMarketOverview(
  globalNews: GlobalNewsResult | null,
  prices: { symbol: string; changePercent?: number }[],
  analysisMap: Record<string, StockAnalysis>,
  sectorTrends: Record<SectorId, SectorTrendInfo>
): MarketOverview {
  const { level, label } = riskFromGlobalNews(globalNews);

  let bullishCount = 0;
  let bearishCount = 0;
  let neutralCount = 0;

  for (const analysis of Object.values(analysisMap)) {
    if (analysis.totalScore >= 2) bullishCount++;
    else if (analysis.totalScore <= -2) bearishCount++;
    else neutralCount++;
  }

  const changes = prices
    .map((p) => p.changePercent)
    .filter((v): v is number => typeof v === "number");
  const avgMarketChange =
    changes.length > 0
      ? changes.reduce((a, b) => a + b, 0) / changes.length
      : 0;

  const sectorRows = Object.values(sectorTrends)
    .sort((a, b) => b.avgChangePercent - a.avgChangePercent)
    .map((s) => ({
      sectorId: s.sectorId,
      name: s.sectorName,
      trend: s.trend,
      trendLabel: s.trendLabel,
      avgChangePercent: s.avgChangePercent,
    }));

  const upSectors = sectorRows.filter((s) => s.trend === "UP").length;
  const downSectors = sectorRows.filter((s) => s.trend === "DOWN").length;

  let summary = `Piyasa genelinde ${bullishCount} hisse teknik olarak guclu, ${bearishCount} hisse zayif. `;
  summary += `Ortalama gunluk degisim %${avgMarketChange.toFixed(2)}. `;
  summary += `${upSectors} sektor yukselis, ${downSectors} sektor dusus trendinde.`;

  if (globalNews?.alertMessage) {
    summary += ` ${globalNews.alertMessage}`;
  }

  return {
    riskLevel: level,
    riskLabel: label,
    summary,
    sectorRows,
    bullishCount,
    bearishCount,
    neutralCount,
    avgMarketChange,
  };
}
