import { getJsonKv, setJsonKv } from "@/lib/db/kv";

const KV = {
  telegramState: "cron:telegram_state",
  rotation: "cron:rotation",
  watchlist: "cron:watchlist",
  heartbeat: "cron:heartbeat",
  kapSeen: "cron:kap_seen",
  priceAlerts: "cron:price_alerts",
  tradeLevels: "cron:trade_levels",
} as const;

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

export async function loadCronTelegramState(): Promise<Record<string, string>> {
  return getJsonKv(KV.telegramState, {});
}

export async function saveCronTelegramState(
  state: Record<string, string>
): Promise<void> {
  await setJsonKv(KV.telegramState, state);
}

export async function loadCronRotationIndex(): Promise<number> {
  const data = await getJsonKv(KV.rotation, { index: 0 });
  return data.index;
}

export async function saveCronRotationIndex(index: number): Promise<void> {
  await setJsonKv(KV.rotation, { index });
}

export async function loadCronWatchlistOverride(): Promise<string[] | null> {
  const list = await getJsonKv<string[] | null>(KV.watchlist, null);
  return list?.length ? list : null;
}

export async function saveCronWatchlistOverride(
  symbols: string[]
): Promise<void> {
  await setJsonKv(KV.watchlist, symbols);
}

export async function saveCronHeartbeat(data: CronHeartbeat): Promise<void> {
  await setJsonKv(KV.heartbeat, data);
}

export async function loadCronHeartbeat(): Promise<CronHeartbeat | null> {
  const data = await getJsonKv<CronHeartbeat | null>(KV.heartbeat, null);
  return data?.lastRunAt ? data : null;
}

export async function loadKapSeenIds(): Promise<Record<string, string[]>> {
  return getJsonKv(KV.kapSeen, {});
}

export async function saveKapSeenIds(
  state: Record<string, string[]>
): Promise<void> {
  await setJsonKv(KV.kapSeen, state);
}

export async function loadCronPriceAlertState(): Promise<
  Record<string, { slTriggered?: boolean; tpTriggered?: boolean }>
> {
  return getJsonKv(KV.priceAlerts, {});
}

export async function saveCronPriceAlertState(
  state: Record<string, { slTriggered?: boolean; tpTriggered?: boolean }>
): Promise<void> {
  await setJsonKv(KV.priceAlerts, state);
}

export async function loadTradeLevelsCache(): Promise<
  Record<string, TradeLevelCacheEntry>
> {
  return getJsonKv(KV.tradeLevels, {});
}

export async function saveTradeLevelsCache(
  cache: Record<string, TradeLevelCacheEntry>
): Promise<void> {
  await setJsonKv(KV.tradeLevels, cache);
}

export async function upsertTradeLevelsCache(
  symbol: string,
  entry: Omit<TradeLevelCacheEntry, "updatedAt">
): Promise<void> {
  const cache = await loadTradeLevelsCache();
  cache[symbol] = { ...entry, updatedAt: new Date().toISOString() };
  await saveTradeLevelsCache(cache);
}
