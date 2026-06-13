const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 8000;

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

function yahooTicker(symbol: string): string {
  return `${symbol}.IS`;
}

function fromYahooTicker(ticker: string): string {
  return ticker.replace(/\.IS$/i, "");
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

export async function fetchYahooQuotes(
  symbols: string[]
): Promise<Record<string, QuoteData>> {
  if (symbols.length === 0) return {};

  const yahooSymbols = symbols.map(yahooTicker).join(",");
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yahooSymbols)}`;

  const res = await yahooFetch(url);
  if (!res.ok) {
    throw new Error(`Yahoo fiyat HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    quoteResponse?: {
      result?: {
        symbol?: string;
        regularMarketPrice?: number;
        regularMarketChangePercent?: number;
      }[];
    };
  };

  const quotes: Record<string, QuoteData> = {};

  for (const item of data.quoteResponse?.result ?? []) {
    const symbol = fromYahooTicker(item.symbol ?? "");
    const price = item.regularMarketPrice;
    if (!symbol || typeof price !== "number" || !Number.isFinite(price)) continue;

    quotes[symbol] = {
      price,
      changePercent:
        typeof item.regularMarketChangePercent === "number"
          ? item.regularMarketChangePercent
          : undefined,
    };
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
