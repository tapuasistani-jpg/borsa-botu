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
      : payload.signalEn === "BUY" || payload.signalEn === "RISKY BUY"
        ? payload.signalEn === "RISKY BUY"
          ? "🟠"
          : "🟢"
        : payload.signalEn === "STRONG SELL" || payload.signalEn === "SELL"
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

  return postTelegramMessage(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, text);
}

export function isTelegramConfigured(): boolean {
  return getTelegramEnv().isConfigured;
}

export interface KapAlertPayload {
  symbol: string;
  title: string;
  link: string;
}

export async function sendTelegramKapAlert(
  payload: KapAlertPayload
): Promise<{ ok: boolean; error?: string }> {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, isConfigured } =
    getTelegramEnv();

  if (!isConfigured || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return { ok: false, error: "Telegram ayarlari eksik." };
  }

  const text = [
    `📋 *Yeni KAP Bildirimi*`,
    ``,
    `📌 Hisse: *${payload.symbol}*`,
    `📰 ${payload.title}`,
    `🔗 ${payload.link}`,
    ``,
    `_Borsa Botu · ${new Date().toLocaleString("tr-TR")}_`,
  ].join("\n");

  return postTelegramMessage(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, text);
}

export interface PriceLevelAlertPayload {
  symbol: string;
  kind: "STOP_LOSS" | "TAKE_PROFIT";
  price: number;
  level: number;
  stopLoss: number;
  takeProfit: number;
}

export async function sendTelegramPriceAlert(
  payload: PriceLevelAlertPayload
): Promise<{ ok: boolean; error?: string }> {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, isConfigured } =
    getTelegramEnv();

  if (!isConfigured || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return { ok: false, error: "Telegram ayarlari eksik." };
  }

  const isSl = payload.kind === "STOP_LOSS";
  const emoji = isSl ? "🛑" : "🎯";
  const label = isSl ? "Zarar Durdur (SL) Tetiklendi" : "Hedef Satis (TP) Tetiklendi";

  const text = [
    `${emoji} *${label}*`,
    ``,
    `📌 Hisse: *${payload.symbol}*`,
    `💰 Guncel: ${payload.price.toFixed(2)} TL`,
    `📍 Seviye: ${payload.level.toFixed(2)} TL`,
    `🛑 SL: ${payload.stopLoss.toFixed(2)} TL · 🎯 TP: ${payload.takeProfit.toFixed(2)} TL`,
    ``,
    `_Borsa Botu · ${new Date().toLocaleString("tr-TR")}_`,
  ].join("\n");

  return postTelegramMessage(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, text);
}

/** Sistem / cron uyari mesajlari */
export async function sendTelegramSystemMessage(
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, isConfigured } =
    getTelegramEnv();

  if (!isConfigured || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return { ok: false, error: "Telegram ayarlari eksik." };
  }

  return postTelegramMessage(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, text);
}

async function postTelegramMessage(
  token: string,
  chatId: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });

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
