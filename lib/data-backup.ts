import { PORTFOLIO_STORAGE_KEY } from "./portfolio";
import {
  SIGNAL_HISTORY_STORAGE_KEY,
  SIGNAL_TRACK_STATE_KEY,
} from "./signal-history";
import { WATCHLIST_STORAGE_KEY } from "./watchlist";

export const TELEGRAM_STATE_KEY = "borsa_telegram_state";
export const BACKUP_VERSION = 1;

export interface BackupPayload {
  version: number;
  exportedAt: string;
  portfolio: unknown;
  signalHistory: unknown;
  signalTrackState: unknown;
  telegramState: unknown;
  watchlist: unknown;
}

export function buildBackupPayload(): BackupPayload {
  const read = (key: string) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    portfolio: read(PORTFOLIO_STORAGE_KEY),
    signalHistory: read(SIGNAL_HISTORY_STORAGE_KEY),
    signalTrackState: read(SIGNAL_TRACK_STATE_KEY),
    telegramState: read(TELEGRAM_STATE_KEY),
    watchlist: read(WATCHLIST_STORAGE_KEY),
  };
}

export function exportBackupJson(): string {
  return JSON.stringify(buildBackupPayload(), null, 2);
}

export function downloadBackupFile() {
  const blob = new Blob([exportBackupJson()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `borsa-botu-yedek-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackupJson(raw: string): { ok: boolean; error?: string } {
  try {
    const data = JSON.parse(raw) as BackupPayload;
    if (!data || typeof data !== "object") {
      return { ok: false, error: "Gecersiz dosya." };
    }

    const write = (key: string, value: unknown) => {
      if (value !== null && value !== undefined) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    };

    write(PORTFOLIO_STORAGE_KEY, data.portfolio);
    write(SIGNAL_HISTORY_STORAGE_KEY, data.signalHistory);
    write(SIGNAL_TRACK_STATE_KEY, data.signalTrackState);
    write(TELEGRAM_STATE_KEY, data.telegramState);
    write(WATCHLIST_STORAGE_KEY, data.watchlist);

    return { ok: true };
  } catch {
    return { ok: false, error: "JSON okunamadi." };
  }
}
