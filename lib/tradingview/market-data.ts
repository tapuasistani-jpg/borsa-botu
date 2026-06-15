import { fetchMidasDailyOhlc, fetchMidasQuotes } from "../midas/market-data";
import {
  fetchYahooDailyOhlc,
  fetchYahooQuotes,
  type OhlcCandle,
  type QuoteData,
} from "../yahoo/market-data";

export type { OhlcCandle, QuoteData };

export type PriceSource = "midas" | "yahoo";

export interface QuoteWithSource extends QuoteData {
  source: PriceSource;
  volume?: number;
}

/** Midas (BIST referans) birincil; eksik semboller Yahoo ile tamamlanir. */
export async function fetchLiveQuotes(
  symbols: string[]
): Promise<Record<string, QuoteWithSource>> {
  if (symbols.length === 0) return {};

  let midasQuotes: Record<string, QuoteData & { volume?: number }> = {};
  try {
    midasQuotes = await fetchMidasQuotes(symbols);
  } catch (error) {
    console.warn("Midas fiyat:", error instanceof Error ? error.message : error);
  }

  const result: Record<string, QuoteWithSource> = {};
  const missing: string[] = [];

  for (const symbol of symbols) {
    const quote = midasQuotes[symbol];
    if (quote) {
      result[symbol] = { ...quote, source: "midas" };
    } else {
      missing.push(symbol);
    }
  }

  if (missing.length > 0) {
    try {
      const yahooQuotes = await fetchYahooQuotes(missing);
      for (const symbol of missing) {
        const quote = yahooQuotes[symbol];
        if (quote) result[symbol] = { ...quote, source: "yahoo" };
      }
    } catch (error) {
      if (Object.keys(result).length === 0) throw error;
      console.warn(
        "Yahoo yedek fiyat:",
        error instanceof Error ? error.message : error
      );
    }
  }

  if (Object.keys(result).length === 0) {
    throw new Error("Fiyat verisi alinamadi (Midas + Yahoo).");
  }

  return result;
}

/** Gunluk mum: Yahoo birincil (gercek OHLC), Midas yedek. */
export async function fetchDailyOhlc(
  symbol: string,
  candleCount = 100
): Promise<{ candles: OhlcCandle[]; source: PriceSource }> {
  try {
    const candles = await fetchYahooDailyOhlc(symbol, candleCount);
    return { candles, source: "yahoo" };
  } catch (error) {
    console.warn(
      `Yahoo mum (${symbol}):`,
      error instanceof Error ? error.message : error
    );
    const candles = await fetchMidasDailyOhlc(symbol, candleCount);
    return { candles, source: "midas" };
  }
}
