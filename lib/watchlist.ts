import { HISSELER } from "./stocks";

export const WATCHLIST_STORAGE_KEY = "borsa_watchlist";
export const MAX_WATCHLIST_SIZE = 30;

export const DEFAULT_WATCHLIST: string[] = [...HISSELER];

const SYMBOL_RE = /^[A-Z0-9]{3,6}$/;

export function isValidBistSymbol(symbol: string): boolean {
  return SYMBOL_RE.test(symbol.trim().toUpperCase());
}

export function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

export function sanitizeWatchlist(symbols: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of symbols) {
    const sym = normalizeSymbol(raw);
    if (!isValidBistSymbol(sym) || seen.has(sym)) continue;
    seen.add(sym);
    result.push(sym);
    if (result.length >= MAX_WATCHLIST_SIZE) break;
  }

  return result.length > 0 ? result : [...DEFAULT_WATCHLIST];
}

export function parseSymbolsParam(raw: string | null): string[] | null {
  if (!raw?.trim()) return null;
  const list = sanitizeWatchlist(raw.split(","));
  return list;
}

export function loadWatchlist(): string[] {
  if (typeof window === "undefined") return [...DEFAULT_WATCHLIST];
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return [...DEFAULT_WATCHLIST];
    return sanitizeWatchlist(JSON.parse(raw) as string[]);
  } catch {
    return [...DEFAULT_WATCHLIST];
  }
}

export function saveWatchlist(symbols: string[]) {
  localStorage.setItem(
    WATCHLIST_STORAGE_KEY,
    JSON.stringify(sanitizeWatchlist(symbols))
  );
}

export function getServerWatchlist(): string[] {
  const env = process.env.WATCHLIST_SYMBOLS?.trim();
  if (env) {
    return sanitizeWatchlist(env.split(","));
  }
  return [...DEFAULT_WATCHLIST];
}
