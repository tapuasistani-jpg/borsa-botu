export interface PortfolioItem {
  id: string;
  symbol: string;
  quantity: number;
  buyPrice: number;
}

export const PORTFOLIO_STORAGE_KEY = "borsa_sanal_portfoy";

export function loadPortfolio(): PortfolioItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PORTFOLIO_STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function savePortfolio(items: PortfolioItem[]) {
  localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(items));
}

export function calcPnL(
  quantity: number,
  buyPrice: number,
  currentPrice: number | null
) {
  if (currentPrice === null) {
    return { pnlTl: null, pnlPercent: null, currentValue: null };
  }
  const cost = quantity * buyPrice;
  const currentValue = quantity * currentPrice;
  const pnlTl = currentValue - cost;
  const pnlPercent = cost > 0 ? (pnlTl / cost) * 100 : 0;
  return { pnlTl, pnlPercent, currentValue };
}

export function newPortfolioId(): string {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
