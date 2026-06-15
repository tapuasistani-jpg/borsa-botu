import { fetchMidasQuotes } from "../midas/market-data";
import {
  fetchYahooDailyOhlc,
  fetchYahooQuotes,
  type OhlcCandle,
  type QuoteData,
} from "../yahoo/market-data";

export type { OhlcCandle, QuoteData };

export { fetchYahooDailyOhlc as fetchDailyOhlc };

export type PriceSource = "midas" | "yahoo";

export interface QuoteWithSource extends QuoteData {
  source: PriceSource;
}

/** Midas (BIST referans) birincil; eksik semboller Yahoo ile tamamlanir. */
export async function fetchLiveQuotes(
  symbols: string[]
): Promise<Record<string, QuoteWithSource>> {
  if (symbols.length === 0) return {};

  let midasQuotes: Record<string, QuoteData> = {};
  try {
    midasQuotes = await fetchMidasQuotes(symbols);
  } catch (error) {
    console.warn(
      "Midas fiyat:",
      error instanceof Error ? error.message : error
    );
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
        if (quote) {
          result[symbol] = { ...quote, source: "yahoo" };
        }
      }
    } catch (error) {
      if (Object.keys(result).length === 0) {
        throw error;
      }
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
