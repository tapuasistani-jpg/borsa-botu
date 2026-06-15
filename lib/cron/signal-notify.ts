const STRONG_SIGNALS = new Set(["STRONG BUY", "STRONG SELL"]);

const ALL_TELEGRAM_SIGNALS = new Set([
  "STRONG BUY",
  "BUY",
  "RISKY BUY",
  "STRONG SELL",
  "SELL",
]);

function telegramSignalMode(): "strong" | "all" {
  const mode = process.env.TELEGRAM_SIGNAL_MODE?.trim().toLowerCase();
  return mode === "strong" ? "strong" : "all";
}

/** Telegram: sinyal degistiginde ve AL/SAT ailesinde */
export function shouldSendSignalTelegram(
  previous: string | undefined,
  current: string
): boolean {
  if (previous === current) return false;

  if (telegramSignalMode() === "strong") {
    return STRONG_SIGNALS.has(current);
  }

  return ALL_TELEGRAM_SIGNALS.has(current);
}

export function isStrongSignal(signalEn: string): boolean {
  return STRONG_SIGNALS.has(signalEn);
}

export function getTelegramSignalModeLabel(): string {
  return telegramSignalMode() === "strong"
    ? "GUCULU AL/SAT"
    : "AL/SAT/RISKLI AL";
}
