import fs from "fs";
import path from "path";

const STATE_FILE = path.join("/tmp", "borsa_cron_telegram_state.json");
const ROTATION_FILE = path.join("/tmp", "borsa_cron_rotation.json");
const WATCHLIST_FILE = path.join("/tmp", "borsa_cron_watchlist.json");

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
