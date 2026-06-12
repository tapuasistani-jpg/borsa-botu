import Parser from "rss-parser";
import type { NewsArticle } from "./types";
import { HISSE_ANAHTAR_KELIMELER, KRITIK_KELIMELER } from "./types";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "BorsaBotu/1.0 (News Aggregator)",
  },
});

function googleNewsUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=tr&gl=TR&ceid=TR:tr`;
}

const GLOBAL_QUERIES = [
  "Trump ekonomi piyasa",
  "savaş riski borsa",
  "BIST faiz TCMB",
  "Fed faiz kararı",
  "dolar TL kur",
  "küresel piyasa risk",
];

async function fetchFeed(url: string): Promise<NewsArticle[]> {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items ?? []).slice(0, 8).map((item) => ({
      title: item.title ?? "",
      link: item.link ?? "",
      source: item.creator ?? item.source ?? undefined,
      publishedAt: item.isoDate ?? item.pubDate ?? undefined,
    }));
  } catch {
    return [];
  }
}

function matchesKeywords(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase()));
}

function dedupeArticles(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    const key = a.title.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function fetchGlobalNews(): Promise<{
  articles: NewsArticle[];
  keywordsMatched: string[];
}> {
  const feeds = await Promise.all(
    GLOBAL_QUERIES.map((q) => fetchFeed(googleNewsUrl(q)))
  );

  const all = dedupeArticles(feeds.flat());
  const keywordsMatched = new Set<string>();

  for (const article of all) {
    for (const kw of matchesKeywords(article.title, [...KRITIK_KELIMELER])) {
      keywordsMatched.add(kw);
    }
  }

  const filtered = all.filter((a) =>
    matchesKeywords(a.title, [...KRITIK_KELIMELER]).length > 0
  );

  return {
    articles: (filtered.length > 0 ? filtered : all).slice(0, 25),
    keywordsMatched: [...keywordsMatched],
  };
}

export async function fetchStockNews(
  symbol: string
): Promise<NewsArticle[]> {
  const keywords = HISSE_ANAHTAR_KELIMELER[symbol] ?? [symbol];
  const query = `${keywords[0]} BIST hisse`;
  const articles = await fetchFeed(googleNewsUrl(query));

  const symbolMatches = articles.filter((a) =>
    matchesKeywords(a.title, keywords).length > 0
  );

  return dedupeArticles(
    symbolMatches.length > 0 ? symbolMatches : articles
  ).slice(0, 6);
}

export function articlesToText(articles: NewsArticle[]): string {
  return articles
    .map((a, i) => `${i + 1}. ${a.title}`)
    .join("\n");
}
