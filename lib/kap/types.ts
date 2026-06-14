export interface KapDisclosure {
  id: string;
  symbol: string;
  title: string;
  link: string;
  publishedAt?: string;
  source: "kap" | "kap-news";
}

export interface KapFeedResult {
  symbol: string;
  items: KapDisclosure[];
}
