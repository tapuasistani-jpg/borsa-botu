import Parser from "rss-parser";
import type { KapDisclosure } from "./types";
import { classifyKapTitle } from "./classify";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; BorsaBotu/1.0; +https://borsa-botu.vercel.app)",
  },
});

const KAP_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  Referer: "https://www.kap.org.tr/tr",
  Origin: "https://www.kap.org.tr",
};

function googleKapUrl(symbol: string): string {
  const q = `${symbol} site:kap.org.tr`;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=tr&gl=TR&ceid=TR:tr`;
}

function disclosureId(link: string, title: string, publishedAt?: string): string {
  return `${link || title}|${publishedAt ?? ""}`.slice(0, 240);
}

async function fetchGoogleKapRss(symbol: string): Promise<KapDisclosure[]> {
  try {
    const feed = await parser.parseURL(googleKapUrl(symbol));
    return (feed.items ?? []).slice(0, 8).map((item) => ({
      id: disclosureId(item.link ?? "", item.title ?? "", item.isoDate),
      symbol,
      title: item.title ?? "",
      link: item.link ?? "",
      publishedAt: item.isoDate ?? item.pubDate ?? undefined,
      source: "kap-news" as const,
    }));
  } catch {
    return [];
  }
}

interface KapApiRow {
  disclosureIndex?: number;
  title?: string;
  summary?: string;
  publishDate?: string;
  stockCode?: string;
  link?: string;
}

async function fetchKapDirect(symbol: string): Promise<KapDisclosure[]> {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const body = {
    fromDate: fmt(from),
    toDate: fmt(to),
    keyword: symbol,
    discClass: "ALL",
    page: 0,
    size: 10,
  };

  try {
    const res = await fetch(
      "https://www.kap.org.tr/tr/api/notification/search/filter",
      {
        method: "POST",
        headers: {
          ...KAP_HEADERS,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) return [];

    const data = (await res.json()) as {
      content?: KapApiRow[];
      data?: KapApiRow[];
    };

    const rows = data.content ?? data.data ?? [];
    return rows
      .filter((row) => {
        const code = (row.stockCode ?? "").toUpperCase();
        return !code || code === symbol.toUpperCase();
      })
      .map((row) => {
        const title = row.title ?? row.summary ?? "KAP bildirimi";
        const index = row.disclosureIndex ?? title;
        const link =
          row.link ??
          `https://www.kap.org.tr/tr/Bildirim/${row.disclosureIndex}`;
        return {
          id: `kap-${index}`,
          symbol,
          title,
          link,
          publishedAt: row.publishDate,
          source: "kap" as const,
        };
      });
  } catch {
    return [];
  }
}

function withClassification(item: KapDisclosure): KapDisclosure {
  const info = classifyKapTitle(item.title);
  return {
    ...item,
    category: info.category,
    categoryLabel: info.label,
    priority: info.priority,
  };
}

function dedupeItems(items: KapDisclosure[]): KapDisclosure[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.id || item.title.toLowerCase();
    if (!item.title.trim() || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function fetchKapDisclosures(
  symbol: string
): Promise<KapDisclosure[]> {
  const [direct, rss] = await Promise.all([
    fetchKapDirect(symbol),
    fetchGoogleKapRss(symbol),
  ]);

  const merged = dedupeItems([...direct, ...rss].map(withClassification));
  return merged.slice(0, 10);
}

export async function fetchKapForSymbols(
  symbols: string[]
): Promise<Record<string, KapDisclosure[]>> {
  const entries = await Promise.all(
    symbols.map(async (symbol) => {
      const items = await fetchKapDisclosures(symbol);
      return [symbol, items] as const;
    })
  );

  return Object.fromEntries(entries);
}
