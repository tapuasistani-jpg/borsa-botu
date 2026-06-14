import fs from "fs";
import path from "path";

const STATE_FILE = path.join("/tmp", "borsa_cron_telegram_state.json");
const ROTATION_FILE = path.join("/tmp", "borsa_cron_rotation.json");
const WATCHLIST_FILE = path.join("/tmp", "borsa_cron_watchlist.json");
const HEARTBEAT_FILE = path.join("/tmp", "borsa_cron_heartbeat.json");
const KAP_SEEN_FILE = path.join("/tmp", "borsa_cron_kap_seen.json");
const PRICE_ALERT_FILE = path.join("/tmp", "borsa_cron_price_alerts.json");
const TRADE_LEVELS_FILE = path.join("/tmp", "borsa_cron_trade_levels.json");

export interface CronHeartbeat {
  lastRunAt: string;
  alertsSent: number;
  kapAlertsSent: number;
  priceAlertsSent: number;
  processed: string[];
  ok: boolean;
  error?: string;
}

export interface TradeLevelCacheEntry {
  stopLoss: number;
  takeProfit: number;
  updatedAt: string;
}

function readJson<T>(file: string, fallback: T): T {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8")) as T;
    }
  } catch {
    // ignore corrupt tmp files
  }
  return fallback;
}

function writeJson(file: string, data: unknown) {
  try {
    fs.writeFileSync(file, JSON.stringify(data));
  } catch {
    // /tmp may fail on some environments — non-fatal
  }
}

export function loadCronTelegramState(): Record<string, string> {
  return readJson<Record<string, string>>(STATE_FILE, {});
}

export function saveCronTelegramState(state: Record<string, string>) {
  writeJson(STATE_FILE, state);
}

export function loadCronRotationIndex(): number {
  return readJson<{ index: number }>(ROTATION_FILE, { index: 0 }).index;
}

export function saveCronRotationIndex(index: number) {
  writeJson(ROTATION_FILE, { index });
}

export function loadCronWatchlistOverride(): string[] | null {
  const list = readJson<string[] | null>(WATCHLIST_FILE, null);
  return list?.length ? list : null;
}

export function saveCronWatchlistOverride(symbols: string[]) {
  writeJson(WATCHLIST_FILE, symbols);
}

export function saveCronHeartbeat(data: CronHeartbeat) {
  writeJson(HEARTBEAT_FILE, data);
}

export function loadCronHeartbeat(): CronHeartbeat | null {
  const data = readJson<CronHeartbeat | null>(HEARTBEAT_FILE, null);
  return data?.lastRunAt ? data : null;
}

export function loadKapSeenIds(): Record<string, string[]> {
  return readJson<Record<string, string[]>>(KAP_SEEN_FILE, {});
}

export function saveKapSeenIds(state: Record<string, string[]>) {
  writeJson(KAP_SEEN_FILE, state);
}

export function loadCronPriceAlertState(): Record<
  string,
  { slTriggered?: boolean; tpTriggered?: boolean }
> {
  return readJson(PRICE_ALERT_FILE, {});
}

export function saveCronPriceAlertState(
  state: Record<string, { slTriggered?: boolean; tpTriggered?: boolean }>
) {
  writeJson(PRICE_ALERT_FILE, state);
}

export function loadTradeLevelsCache(): Record<string, TradeLevelCacheEntry> {
  return readJson(TRADE_LEVELS_FILE, {});
}

export function saveTradeLevelsCache(
  cache: Record<string, TradeLevelCacheEntry>
) {
  writeJson(TRADE_LEVELS_FILE, cache);
}

export function upsertTradeLevelsCache(
  symbol: string,
  entry: Omit<TradeLevelCacheEntry, "updatedAt">
) {
  const cache = loadTradeLevelsCache();
  cache[symbol] = { ...entry, updatedAt: new Date().toISOString() };
  saveTradeLevelsCache(cache);
}
