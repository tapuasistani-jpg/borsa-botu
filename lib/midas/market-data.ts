import type { OhlcCandle, QuoteData } from "../yahoo/market-data";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const MIDAS_TABLE_URL =
  "https://www.getmidas.com/wp-json/midas-api/v1/midas_table_data?sortId=&return=table";

const MIDAS_HISTORY_URL =
  "https://www.getmidas.com/wp-json/midas-api/v1/midas_stock_time";

const FETCH_TIMEOUT_MS = 10_000;
const TABLE_CACHE_TTL_MS = 30_000;
const OHLC_CACHE_TTL_MS = 5 * 60_000;

export interface MidasQuoteData extends QuoteData {
  volume?: number;
  open?: number;
  high?: number;
  low?: number;
}

interface MidasRow {
  Code?: string;
  Last?: number;
  Open?: number;
  High?: number;
  Low?: number;
  DailyChangePercent?: number;
  PreviousClose?: number;
  TotalVolume?: number;
}

interface MidasHistoryPayload {
  data?: number[];
  dates?: number[];
}

let tableCache: {
  map: Map<string, MidasQuoteData>;
  fetchedAt: number;
} | null = null;

const ohlcCache = new Map<string, { candles: OhlcCandle[]; fetchedAt: number }>();

async function midasFetch(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      headers: {
        "User-Agent": USER_AGENT,
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchMidasTableMap(): Promise<Map<string, MidasQuoteData>> {
  const now = Date.now();
  if (tableCache && now - tableCache.fetchedAt < TABLE_CACHE_TTL_MS) {
    return tableCache.map;
  }

  const res = await midasFetch(MIDAS_TABLE_URL);
  if (!res.ok) throw new Error(`Midas HTTP ${res.status}`);

  let body: unknown = await res.json();
  if (typeof body === "string") body = JSON.parse(body) as unknown;
  if (!Array.isArray(body)) throw new Error("Midas tablo verisi gecersiz.");

  const map = new Map<string, MidasQuoteData>();

  for (const row of body as MidasRow[]) {
    const code = row.Code?.trim().toUpperCase();
    const price = row.Last;
    if (!code || typeof price !== "number" || !Number.isFinite(price)) continue;

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

    map.set(code, {
      price,
      changePercent,
      volume: row.TotalVolume,
      open: row.Open,
      high: row.High,
      low: row.Low,
    });
  }

  if (map.size === 0) throw new Error("Midas tablo verisi bos.");

  tableCache = { map, fetchedAt: now };
  return map;
}

export async function fetchMidasQuotes(
  symbols: string[]
): Promise<Record<string, MidasQuoteData>> {
  if (symbols.length === 0) return {};
  const table = await fetchMidasTableMap();
  const quotes: Record<string, MidasQuoteData> = {};
  for (const symbol of symbols) {
    const quote = table.get(symbol.toUpperCase());
    if (quote) quotes[symbol] = quote;
  }
  return quotes;
}

export async function fetchMidasDailyOhlc(
  symbol: string,
  candleCount = 100
): Promise<OhlcCandle[]> {
  const key = symbol.toUpperCase();
  const cached = ohlcCache.get(key);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < OHLC_CACHE_TTL_MS) {
    return cached.candles.slice(-candleCount);
  }

  const url = `${MIDAS_HISTORY_URL}?code=${encodeURIComponent(key)}&time=1Y`;
  const res = await midasFetch(url);
  if (!res.ok) throw new Error(`Midas mum HTTP ${res.status}`);

  let body: unknown = await res.json();
  if (typeof body === "string") body = JSON.parse(body) as unknown;

  const payload = body as MidasHistoryPayload;
  const closes = payload.data ?? [];
  const dates = payload.dates ?? [];

  if (closes.length < 50) {
    throw new Error("Midas mum verisi yetersiz.");
  }

  const table = await fetchMidasTableMap().catch(() => null);
  const live = table?.get(key);

  const candles: OhlcCandle[] = closes.map((close, index) => {
    const isLast = index === closes.length - 1;
    const open = isLast && live?.open != null ? live.open : close;
    const high = isLast && live?.high != null ? live.high : close;
    const low = isLast && live?.low != null ? live.low : close;
    const volume = isLast ? live?.volume : undefined;

    return { open, high, low, close, volume };
  });

  ohlcCache.set(key, { candles, fetchedAt: now });
  return candles.slice(-candleCount);
}

export async function fetchMidasQuoteOne(
  symbol: string
): Promise<MidasQuoteData | null> {
  const quotes = await fetchMidasQuotes([symbol]);
  return quotes[symbol] ?? null;
}
