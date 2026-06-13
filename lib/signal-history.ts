import {
  SIGNAL_EVAL_HOURS,
  SIGNAL_LOSS_THRESHOLD,
  SIGNAL_WIN_THRESHOLD,
} from "./trading-config";

const STORAGE_KEY = "borsa_signal_history";
export const SIGNAL_HISTORY_STORAGE_KEY = STORAGE_KEY;
export const SIGNAL_TRACK_STATE_KEY = "borsa_signal_track_state";
const MAX_RECORDS = 50;
const DISPLAY_COUNT = 10;

export type SignalRecordStatus = "OPEN" | "WIN" | "LOSS";

export interface SignalRecord {
  id: string;
  symbol: string;
  signalEn: string;
  entryPrice: number;
  timestamp: number;
  status: SignalRecordStatus;
  exitPrice?: number;
  evaluatedAt?: number;
}

export interface SuccessScore {
  percent: number;
  wins: number;
  total: number;
  recent: SignalRecord[];
}

const ACTIONABLE = new Set([
  "STRONG BUY",
  "BUY",
  "RISKY BUY",
  "SELL",
  "STRONG SELL",
]);

function loadRecords(): SignalRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SignalRecord[]) : [];
  } catch {
    return [];
  }
}

function saveRecords(records: SignalRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-MAX_RECORDS)));
}

function isBuySignal(signalEn: string) {
  return (
    signalEn === "STRONG BUY" ||
    signalEn === "BUY" ||
    signalEn === "RISKY BUY"
  );
}

function isSellSignal(signalEn: string) {
  return signalEn === "STRONG SELL" || signalEn === "SELL";
}

export function recordSignalIfNew(
  symbol: string,
  signalEn: string,
  price: number | null,
  lastRecorded?: string
): string | undefined {
  if (!ACTIONABLE.has(signalEn) || price === null || price <= 0) {
    return lastRecorded;
  }

  if (lastRecorded === signalEn) {
    return lastRecorded;
  }

  const records = loadRecords();
  records.push({
    id: `${symbol}-${Date.now()}`,
    symbol,
    signalEn,
    entryPrice: price,
    timestamp: Date.now(),
    status: "OPEN",
  });
  saveRecords(records);
  return signalEn;
}

export function evaluateOpenSignals(
  prices: { symbol: string; price: number | null }[]
): SignalRecord[] {
  const records = loadRecords();
  const evalMs = SIGNAL_EVAL_HOURS * 60 * 60 * 1000;
  const now = Date.now();
  let changed = false;

  for (const record of records) {
    if (record.status !== "OPEN") continue;

    const current = prices.find((p) => p.symbol === record.symbol)?.price;
    if (current === null || current === undefined) continue;

    const elapsed = now - record.timestamp;
    const changePercent =
      ((current - record.entryPrice) / record.entryPrice) * 100;

    let resolved = false;

    if (isBuySignal(record.signalEn)) {
      if (changePercent >= SIGNAL_WIN_THRESHOLD) {
        record.status = "WIN";
        resolved = true;
      } else if (
        changePercent <= SIGNAL_LOSS_THRESHOLD ||
        elapsed >= evalMs
      ) {
        record.status = "LOSS";
        resolved = true;
      }
    } else if (isSellSignal(record.signalEn)) {
      const sellChange = -changePercent;
      if (sellChange >= SIGNAL_WIN_THRESHOLD) {
        record.status = "WIN";
        resolved = true;
      } else if (
        sellChange <= SIGNAL_LOSS_THRESHOLD ||
        elapsed >= evalMs
      ) {
        record.status = "LOSS";
        resolved = true;
      }
    }

    if (resolved) {
      record.exitPrice = current;
      record.evaluatedAt = now;
      changed = true;
    }
  }

  if (changed) {
    saveRecords(records);
  }

  return records;
}

export function getSuccessScore(): SuccessScore {
  const records = loadRecords();
  const evaluated = records.filter(
    (r) => r.status === "WIN" || r.status === "LOSS"
  );
  const recent = evaluated.slice(-DISPLAY_COUNT);
  const wins = recent.filter((r) => r.status === "WIN").length;
  const total = recent.length;

  return {
    percent: total > 0 ? Math.round((wins / total) * 100) : 0,
    wins,
    total,
    recent,
  };
}

export function loadSignalState(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(SIGNAL_TRACK_STATE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveSignalState(state: Record<string, string>) {
  localStorage.setItem(SIGNAL_TRACK_STATE_KEY, JSON.stringify(state));
}
