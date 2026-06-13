const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 8000;
const QUOTE_BATCH_SIZE = 5;

export interface QuoteData {
  price: number;
  changePercent?: number;
}

export interface OhlcCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface YahooChartMeta {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
}

function yahooTicker(symbol: string): string {
  return `${symbol}.IS`;
}

async function yahooFetch(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function quoteFromMeta(meta: YahooChartMeta | undefined): QuoteData | null {
  const price = meta?.regularMarketPrice;
  if (typeof price !== "number" || !Number.isFinite(price)) {
    return null;
  }

  const prev = meta?.chartPreviousClose;
  let changePercent: number | undefined;
  if (typeof prev === "number" && prev > 0) {
    changePercent = ((price - prev) / prev) * 100;
  }

  return { price, changePercent };
}

async function fetchYahooQuoteOne(symbol: string): Promise<QuoteData | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker(symbol))}?interval=1d&range=1d`;

  const res = await yahooFetch(url);
  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as {
    chart?: { result?: { meta?: YahooChartMeta }[] };
  };

  return quoteFromMeta(data.chart?.result?.[0]?.meta);
}

export async function fetchYahooQuotes(
  symbols: string[]
): Promise<Record<string, QuoteData>> {
  if (symbols.length === 0) return {};

  const quotes: Record<string, QuoteData> = {};

  for (let i = 0; i < symbols.length; i += QUOTE_BATCH_SIZE) {
    const batch = symbols.slice(i, i + QUOTE_BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (symbol) => {
        try {
          const quote = await fetchYahooQuoteOne(symbol);
          return { symbol, quote };
        } catch {
          return { symbol, quote: null };
        }
      })
    );

    for (const { symbol, quote } of results) {
      if (quote) {
        quotes[symbol] = quote;
      }
    }
  }

  if (Object.keys(quotes).length === 0) {
    throw new Error("Yahoo fiyat verisi alinamadi.");
  }

  return quotes;
}

export async function fetchYahooDailyOhlc(
  symbol: string,
  candleCount = 100
): Promise<OhlcCandle[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker(symbol))}?interval=1d&range=1y`;

  const res = await yahooFetch(url);
  if (!res.ok) {
    throw new Error(`Yahoo mum HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    chart?: {
      result?: {
        timestamp?: number[];
        indicators?: {
          quote?: {
            open?: (number | null)[];
            high?: (number | null)[];
            low?: (number | null)[];
            close?: (number | null)[];
            volume?: (number | null)[];
          }[];
        };
      }[];
    };
  };

  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0];

  if (!q || timestamps.length === 0) {
    throw new Error("Yahoo mum verisi bos.");
  }

  const candles: OhlcCandle[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const open = q.open?.[i];
    const high = q.high?.[i];
    const low = q.low?.[i];
    const close = q.close?.[i];
    if (
      open == null ||
      high == null ||
      low == null ||
      close == null ||
      !Number.isFinite(open + high + low + close)
    ) {
      continue;
    }
    candles.push({
      open,
      high,
      low,
      close,
      volume: q.volume?.[i] ?? undefined,
    });
  }

  if (candles.length === 0) {
    throw new Error("Yahoo mum verisi gecersiz.");
  }

  return candles.slice(-candleCount);
}
