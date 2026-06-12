import { getTelegramEnv } from "@/lib/env";

export interface TelegramAlertPayload {
  symbol: string;
  signalEn: string;
  signalTr: string;
  price: number | null;
  reason: string;
}

export async function sendTelegramAlert(
  payload: TelegramAlertPayload
): Promise<{ ok: boolean; error?: string }> {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, isConfigured } =
    getTelegramEnv();

  if (!isConfigured || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return {
      ok: false,
      error: "Telegram ayarlari eksik (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID).",
    };
  }

  const emoji =
    payload.signalEn === "STRONG BUY"
      ? "🟢"
      : payload.signalEn === "STRONG SELL"
        ? "🔴"
        : "📊";

  const priceText =
    payload.price !== null ? `${payload.price.toFixed(2)} TL` : "—";

  const text = [
    `${emoji} *${payload.signalTr}* (${payload.signalEn})`,
    ``,
    `📌 Hisse: *${payload.symbol}*`,
    `💰 Fiyat: ${priceText}`,
    `🧠 Teknik + Haber birlesik sinyal`,
    ``,
    `📝 ${payload.reason}`,
    ``,
    `_Borsa Botu · ${new Date().toLocaleString("tr-TR")}_`,
  ].join("\n");

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
      }
    );

    const data = await res.json();
    if (!data.ok) {
      return {
        ok: false,
        error: data.description ?? "Telegram gonderimi basarisiz.",
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Baglanti hatasi.",
    };
  }
}

export function isTelegramConfigured(): boolean {
  return getTelegramEnv().isConfigured;
}
