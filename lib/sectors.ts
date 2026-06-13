import type { StockAnalysis } from "./stocks";

export type SectorId =
  | "banking"
  | "holding"
  | "industrial"
  | "energy"
  | "defense"
  | "transport"
  | "retail"
  | "automotive"
  | "tech"
  | "renewable";

export type SectorTrend = "UP" | "DOWN" | "FLAT";

export interface SectorMeta {
  id: SectorId;
  name: string;
}

export interface SectorTrendInfo {
  sectorId: SectorId;
  sectorName: string;
  trend: SectorTrend;
  trendLabel: string;
  avgChangePercent: number;
  avgTaScore: number;
  stockCount: number;
}

export interface StockSectorInfo {
  sectorId: SectorId;
  sectorName: string;
  trend: SectorTrend;
  trendLabel: string;
  avgChangePercent: number;
}

export const STOCK_SECTOR: Record<string, SectorMeta> = {
  THYAO: { id: "transport", name: "Ulasim/Havacilik" },
  TUPRS: { id: "energy", name: "Enerji/Petrol" },
  EREGL: { id: "industrial", name: "Sanayi/Celik" },
  ASELS: { id: "defense", name: "Savunma" },
  AKBNK: { id: "banking", name: "Bankacilik" },
  ISCTR: { id: "banking", name: "Bankacilik" },
  BIMAS: { id: "retail", name: "Perakende" },
  FROTO: { id: "automotive", name: "Otomotiv" },
  KCHOL: { id: "holding", name: "Holding" },
  SAHOL: { id: "holding", name: "Holding" },
  REEDR: { id: "tech", name: "Teknoloji" },
  ASTOR: { id: "renewable", name: "Yenilenebilir Enerji" },
  KONTR: { id: "industrial", name: "Sanayi" },
  YEOTK: { id: "tech", name: "Teknoloji" },
  SMRTG: { id: "renewable", name: "Yenilenebilir Enerji" },
};

function trendFromMetrics(
  avgChange: number,
  avgScore: number
): { trend: SectorTrend; trendLabel: string } {
  if (avgChange > 0.3 || avgScore >= 1) {
    return { trend: "UP", trendLabel: "Yukselis" };
  }
  if (avgChange < -0.3 || avgScore <= -1) {
    return { trend: "DOWN", trendLabel: "Dusus" };
  }
  return { trend: "FLAT", trendLabel: "Yatay" };
}

export function computeSectorTrends(
  prices: { symbol: string; changePercent?: number }[],
  analysisMap: Record<string, StockAnalysis>
): Record<SectorId, SectorTrendInfo> {
  const buckets = new Map<
    SectorId,
    { changes: number[]; scores: number[]; name: string }
  >();

  for (const [symbol, meta] of Object.entries(STOCK_SECTOR)) {
    if (!buckets.has(meta.id)) {
      buckets.set(meta.id, { changes: [], scores: [], name: meta.name });
    }
    const bucket = buckets.get(meta.id)!;
    const priceRow = prices.find((p) => p.symbol === symbol);
    if (typeof priceRow?.changePercent === "number") {
      bucket.changes.push(priceRow.changePercent);
    }
    const analysis = analysisMap[symbol];
    if (analysis) {
      bucket.scores.push(analysis.totalScore);
    }
  }

  const result = {} as Record<SectorId, SectorTrendInfo>;

  for (const [sectorId, bucket] of buckets) {
    const avgChangePercent =
      bucket.changes.length > 0
        ? bucket.changes.reduce((a, b) => a + b, 0) / bucket.changes.length
        : 0;
    const avgTaScore =
      bucket.scores.length > 0
        ? bucket.scores.reduce((a, b) => a + b, 0) / bucket.scores.length
        : 0;
    const { trend, trendLabel } = trendFromMetrics(avgChangePercent, avgTaScore);

    result[sectorId] = {
      sectorId,
      sectorName: bucket.name,
      trend,
      trendLabel,
      avgChangePercent,
      avgTaScore,
      stockCount: bucket.changes.length || bucket.scores.length,
    };
  }

  return result;
}

export function getStockSectorInfo(
  symbol: string,
  sectorTrends: Record<SectorId, SectorTrendInfo>
): StockSectorInfo | null {
  const meta = STOCK_SECTOR[symbol];
  if (!meta) return null;

  const trendInfo = sectorTrends[meta.id];
  if (!trendInfo) {
    return {
      sectorId: meta.id,
      sectorName: meta.name,
      trend: "FLAT",
      trendLabel: "Yatay",
      avgChangePercent: 0,
    };
  }

  return {
    sectorId: meta.id,
    sectorName: meta.name,
    trend: trendInfo.trend,
    trendLabel: trendInfo.trendLabel,
    avgChangePercent: trendInfo.avgChangePercent,
  };
}
