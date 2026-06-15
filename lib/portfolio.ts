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

export interface PortfolioTotals {
  totalCost: number;
  totalValue: number;
  pnlTl: number | null;
  pnlPercent: number | null;
  allPricesAvailable: boolean;
}

export function calcPortfolioTotals(
  items: PortfolioItem[],
  prices: { symbol: string; price: number | null }[]
): PortfolioTotals {
  let totalCost = 0;
  let totalValue = 0;
  let valuedCost = 0;
  let missingPrices = 0;

  for (const item of items) {
    const cost = item.quantity * item.buyPrice;
    totalCost += cost;

    const live = prices.find((p) => p.symbol === item.symbol)?.price ?? null;
    if (live === null) {
      missingPrices += 1;
      continue;
    }

    totalValue += item.quantity * live;
    valuedCost += cost;
  }

  const allPricesAvailable =
    items.length > 0 && missingPrices === 0;

  if (valuedCost <= 0) {
    return {
      totalCost,
      totalValue,
      pnlTl: null,
      pnlPercent: null,
      allPricesAvailable,
    };
  }

  const pnlTl = totalValue - valuedCost;
  const pnlPercent = (pnlTl / valuedCost) * 100;

  return {
    totalCost,
    totalValue,
    pnlTl,
    pnlPercent,
    allPricesAvailable,
  };
}

export function newPortfolioId(): string {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const SYMBOL_RE = /^[A-Z0-9]{3,6}$/;

export function sanitizePortfolio(raw: unknown[]): PortfolioItem[] {
  const result: PortfolioItem[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const symbol = String(row.symbol ?? "")
      .trim()
      .toUpperCase();
    const quantity = Number(row.quantity);
    const buyPrice = Number(row.buyPrice);

    if (!SYMBOL_RE.test(symbol)) continue;
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    if (!Number.isFinite(buyPrice) || buyPrice <= 0) continue;

    result.push({
      id:
        typeof row.id === "string" && row.id.trim()
          ? row.id.trim()
          : newPortfolioId(),
      symbol,
      quantity,
      buyPrice,
    });
  }

  return result;
}
