const STRONG_SIGNALS = new Set(["STRONG BUY", "STRONG SELL"]);

/** Telegram yalnizca sinyal degistiginde ve guclu AL/SAT oldugunda */
export function shouldSendSignalTelegram(
  previous: string | undefined,
  current: string
): boolean {
  if (previous === current) return false;
  return STRONG_SIGNALS.has(current);
}

export function isStrongSignal(signalEn: string): boolean {
  return STRONG_SIGNALS.has(signalEn);
}
