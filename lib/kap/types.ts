export interface KapDisclosure {
  id: string;
  symbol: string;
  title: string;
  link: string;
  publishedAt?: string;
  source: "kap" | "kap-news";
  category?: string;
  categoryLabel?: string;
  priority?: boolean;
}

export interface KapFeedResult {
  symbol: string;
  items: KapDisclosure[];
}
