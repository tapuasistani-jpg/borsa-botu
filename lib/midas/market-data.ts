import type { QuoteData } from "../yahoo/market-data";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const MIDAS_TABLE_URL =
  "https://www.getmidas.com/wp-json/midas-api/v1/midas_table_data?sortId=&return=table";

const FETCH_TIMEOUT_MS = 10_000;
const TABLE_CACHE_TTL_MS = 30_000;

interface MidasRow {
  Code?: string;
  Last?: number;
  DailyChangePercent?: number;
  PreviousClose?: number;
}

let tableCache: {
  map: Map<string, QuoteData>;
  fetchedAt: number;
} | null = null;

async function fetchMidasTableMap(): Promise<Map<string, QuoteData>> {
  const now = Date.now();
  if (tableCache && now - tableCache.fetchedAt < TABLE_CACHE_TTL_MS) {
    return tableCache.map;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(MIDAS_TABLE_URL, {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Midas HTTP ${res.status}`);
    }

    let body: unknown = await res.json();
    if (typeof body === "string") {
      body = JSON.parse(body) as unknown;
    }

    if (!Array.isArray(body)) {
      throw new Error("Midas tablo verisi gecersiz.");
    }

    const map = new Map<string, QuoteData>();

    for (const row of body as MidasRow[]) {
      const code = row.Code?.trim().toUpperCase();
      const price = row.Last;
      if (!code || typeof price !== "number" || !Number.isFinite(price)) {
        continue;
      }

      let changePercent: number | undefined;
      if (
        typeof row.DailyChangePercent === "number" &&
        Number.isFinite(row.DailyChangePercent)
      ) {
        changePercent = row.DailyChangePercent;
      } else if (
        typeof row.PreviousClose === "number" &&
        row.PreviousClose > 0
      ) {
        changePercent = ((price - row.PreviousClose) / row.PreviousClose) * 100;
      }

      map.set(code, { price, changePercent });
    }

    if (map.size === 0) {
      throw new Error("Midas tablo verisi bos.");
    }

    tableCache = { map, fetchedAt: now };
    return map;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchMidasQuotes(
  symbols: string[]
): Promise<Record<string, QuoteData>> {
  if (symbols.length === 0) return {};

  const table = await fetchMidasTableMap();
  const quotes: Record<string, QuoteData> = {};

  for (const symbol of symbols) {
    const quote = table.get(symbol.toUpperCase());
    if (quote) {
      quotes[symbol] = quote;
    }
  }

  return quotes;
}
