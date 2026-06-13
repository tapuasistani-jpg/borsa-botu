import { HISSELER } from "@/lib/stocks";
import { fetchGlobalNews, fetchStockNews } from "./rss-feeds";
import {
  analyzeSentimentRuleBased,
  getKeywordBankSize,
  type SentimentAnalysisResult,
} from "./sentiment";
import type { NewsArticle, GlobalNewsResult, NewsEngineResult, StockNewsResult } from "./types";

function mapAnalysis(
  analysis: SentimentAnalysisResult,
  headlines: NewsArticle[]
): Omit<StockNewsResult, "symbol"> {
  return {
    sentiment: analysis.sentiment,
    summary: analysis.summary,
    headlines,
    alertMessage: analysis.alertMessage,
    positivePercent: analysis.positivePercent,
    negativePercent: analysis.negativePercent,
    riskyPercent: analysis.riskyPercent,
    neutralPercent: analysis.neutralPercent,
    matchedKeywords: analysis.matchedKeywords.map((m) => m.word),
  };
}

export async function runGlobalNews(): Promise<Pick<NewsEngineResult, "global" | "keywordBankSize">> {
  const { articles: globalArticles, keywordsMatched } = await fetchGlobalNews();
  const globalAnalysis = analyzeSentimentRuleBased(globalArticles);

  const global: GlobalNewsResult = {
    ...mapAnalysis(globalAnalysis, globalArticles),
    keywordsMatched:
      keywordsMatched.length > 0
        ? keywordsMatched
        : globalAnalysis.matchedKeywords.map((m) => m.word).slice(0, 12),
  };

  return { global, keywordBankSize: getKeywordBankSize() };
}

export async function runStockNews(symbol: string): Promise<StockNewsResult> {
  const headlines = await fetchStockNews(symbol);
  const analysis = analyzeSentimentRuleBased(headlines);
  return { symbol, ...mapAnalysis(analysis, headlines) };
}

export async function runNewsEngine(): Promise<NewsEngineResult> {
  const { global, keywordBankSize } = await runGlobalNews();
  const stocks: Record<string, StockNewsResult> = {};

  for (let i = 0; i < HISSELER.length; i += 5) {
    const batch = HISSELER.slice(i, i + 5);
    const results = await Promise.all(batch.map((s) => runStockNews(s)));
    batch.forEach((sym, idx) => {
      stocks[sym] = results[idx];
    });
  }

  return {
    global,
    stocks,
    keywordBankSize,
    updatedAt: new Date().toISOString(),
  };
}
