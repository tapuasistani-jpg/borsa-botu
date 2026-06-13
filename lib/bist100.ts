import { fetchYahooQuotes } from "./yahoo/market-data";

export const BIST100_SYMBOL = "XU100";

export interface Bist100Quote {
  changePercent: number;
  updatedAt: string;
}

export interface Bist100Comparison {
  stockChange: number;
  indexChange: number;
  relativePercent: number;
  label: string;
  trend: "OUTPERFORM" | "UNDERPERFORM" | "INLINE";
}

export async function fetchBist100Quote(): Promise<Bist100Quote | null> {
  try {
    const quotes = await fetchYahooQuotes([BIST100_SYMBOL]);
    const q = quotes[BIST100_SYMBOL];
    if (!q || typeof q.changePercent !== "number") {
      return null;
    }
    return {
      changePercent: q.changePercent,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function compareToBist100(
  stockChangePercent: number | undefined,
  indexChangePercent: number | null
): Bist100Comparison | null {
  if (
    typeof stockChangePercent !== "number" ||
    indexChangePercent === null ||
    !Number.isFinite(indexChangePercent)
  ) {
    return null;
  }

  const relativePercent = stockChangePercent - indexChangePercent;
  const abs = Math.abs(relativePercent);

  if (abs < 0.25) {
    return {
      stockChange: stockChangePercent,
      indexChange: indexChangePercent,
      relativePercent,
      label: "BIST100 ile ayni hizada",
      trend: "INLINE",
    };
  }

  if (relativePercent > 0) {
    return {
      stockChange: stockChangePercent,
      indexChange: indexChangePercent,
      relativePercent,
      label: `BIST100'den +${relativePercent.toFixed(1)}% iyi`,
      trend: "OUTPERFORM",
    };
  }

  return {
    stockChange: stockChangePercent,
    indexChange: indexChangePercent,
    relativePercent,
    label: `BIST100'den ${relativePercent.toFixed(1)}% kotu`,
    trend: "UNDERPERFORM",
  };
}
