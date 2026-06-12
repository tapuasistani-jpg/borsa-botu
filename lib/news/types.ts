export type NewsSentiment = "POSITIVE" | "NEGATIVE" | "RISKY" | "NEUTRAL";

export type CombinedSignalEn =
  | "STRONG BUY"
  | "BUY"
  | "RISKY BUY"
  | "HOLD"
  | "NEUTRAL"
  | "SELL"
  | "STRONG SELL";

export interface NewsArticle {
  title: string;
  link: string;
  source?: string;
  publishedAt?: string;
}

export interface SentimentResult {
  sentiment: NewsSentiment;
  summary: string;
  headlines: NewsArticle[];
  alertMessage: string;
  positivePercent: number;
  negativePercent: number;
  riskyPercent: number;
  neutralPercent: number;
  matchedKeywords: string[];
}

export interface StockNewsResult extends SentimentResult {
  symbol: string;
}

export interface GlobalNewsResult extends SentimentResult {
  keywordsMatched: string[];
}

export interface NewsEngineResult {
  global: GlobalNewsResult;
  stocks: Record<string, StockNewsResult>;
  keywordBankSize: number;
  updatedAt: string;
}

export interface CombinedSignal {
  signalEn: CombinedSignalEn;
  signalTr: string;
  color: "green" | "yellow" | "red" | "orange";
  reason: string;
}

export const KRITIK_KELIMELER = [
  "Trump",
  "savaş",
  "savas",
  "war",
  "BIST",
  "Borsa Istanbul",
  "faiz",
  "Fed",
  "TCMB",
  "enflasyon",
  "dolar",
  "altın",
  "gümrük",
  "tarife",
  "Ukrayna",
  "İsrail",
  "Gazze",
  "Kriz",
  "risk",
  "Twitter",
  "X ",
  "Elon Musk",
] as const;

export const HISSE_ANAHTAR_KELIMELER: Record<string, string[]> = {
  THYAO: ["THY", "Türk Hava Yolları", "THYAO"],
  TUPRS: ["Tüpraş", "TUPRS", "petrol"],
  EREGL: ["Erdemir", "EREGL", "çelik"],
  ASELS: ["Aselsan", "ASELS", "savunma"],
  AKBNK: ["Akbank", "AKBNK"],
  ISCTR: ["İş Bankası", "ISCTR"],
  BIMAS: ["BIM", "BIMAS"],
  FROTO: ["Ford Otosan", "FROTO"],
  KCHOL: ["Koç Holding", "KCHOL"],
  SAHOL: ["Sabancı", "SAHOL"],
  REEDR: ["Reeder", "REEDR"],
  ASTOR: ["Astor", "ASTOR", "enerji"],
  KONTR: ["Kontrolmatik", "KONTR"],
  YEOTK: ["Yeo Teknoloji", "YEOTK"],
  SMRTG: ["Smart Güneş", "SMRTG", "güneş"],
};
