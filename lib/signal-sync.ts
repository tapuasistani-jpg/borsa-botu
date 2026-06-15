import type { SignalRecord, SignalRecordStatus, SuccessScore } from "@/lib/signal-history";
import {
  SIGNAL_EVAL_HOURS,
  SIGNAL_LOSS_THRESHOLD,
  SIGNAL_WIN_THRESHOLD,
} from "@/lib/trading-config";
import {
  loadSignalRecords,
  loadSignalTrackState,
  saveSignalRecords,
  saveSignalTrackState,
} from "@/lib/db/signal-db";

const ACTIONABLE = new Set([
  "STRONG BUY",
  "BUY",
  "RISKY BUY",
  "SELL",
  "STRONG SELL",
]);

const DISPLAY_COUNT = 10;

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

export interface SignalSyncEntry {
  symbol: string;
  signalEn: string;
  signalTr?: string;
  price: number | null;
  reason?: string;
  taSummary?: string;
  technicalReason?: string;
}

function evaluateRecords(
  records: SignalRecord[],
  prices: { symbol: string; price: number | null }[]
): SignalRecord[] {
  const evalMs = SIGNAL_EVAL_HOURS * 60 * 60 * 1000;
  const now = Date.now();

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
    }
  }

  return records;
}

function computeScore(records: SignalRecord[]): SuccessScore {
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

export async function syncSignals(
  prices: { symbol: string; price: number | null }[],
  entries: SignalSyncEntry[]
): Promise<{ records: SignalRecord[]; score: SuccessScore }> {
  let records = await loadSignalRecords();
  records = evaluateRecords(records, prices);

  const state = await loadSignalTrackState();

  for (const entry of entries) {
    const { symbol, signalEn, price } = entry;
    if (!ACTIONABLE.has(signalEn) || price === null || price <= 0) continue;
    if (state[symbol] === signalEn) continue;

    records.push({
      id: `${symbol}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      symbol,
      signalEn,
      signalTr: entry.signalTr,
      entryPrice: price,
      timestamp: Date.now(),
      status: "OPEN" as SignalRecordStatus,
      reason: entry.reason,
      taSummary: entry.taSummary,
      technicalReason: entry.technicalReason,
    });
    state[symbol] = signalEn;
  }

  await saveSignalRecords(records);
  await saveSignalTrackState(state);

  const score = computeScore(records);
  return { records, score };
}

export async function getSignalSnapshot(): Promise<{
  records: SignalRecord[];
  score: SuccessScore;
}> {
  const records = await loadSignalRecords();
  return { records, score: computeScore(records) };
}
