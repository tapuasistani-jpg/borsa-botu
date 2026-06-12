/**
 * Tum gizli ayarlar tek noktadan okunur (Vercel Environment Variables ile uyumlu).
 * .env.local (local) ve Vercel Dashboard (production) ayni isimleri kullanir.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Eksik ortam degiskeni: ${name}. Local icin .env.local, Vercel icin Project Settings > Environment Variables.`
    );
  }
  return value.trim();
}

function optional(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v || undefined;
}

/** HTTPS uzerinde calisiyor mu (Vercel production + preview) */
export function isSecureDeployment(): boolean {
  return (
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1"
  );
}

/** Zorunlu: giris + oturum */
export function getAuthEnv() {
  const JWT_SECRET = required("JWT_SECRET", process.env.JWT_SECRET);
  if (JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET en az 32 karakter olmali.");
  }
  return {
    AUTH_USERNAME: required("AUTH_USERNAME", process.env.AUTH_USERNAME),
    AUTH_PASSWORD: required("AUTH_PASSWORD", process.env.AUTH_PASSWORD),
    JWT_SECRET,
  };
}

/** Opsiyonel: Telegram bildirimleri */
export function getTelegramEnv() {
  const token = optional(process.env.TELEGRAM_BOT_TOKEN);
  const chatId = optional(process.env.TELEGRAM_CHAT_ID);
  return {
    TELEGRAM_BOT_TOKEN: token,
    TELEGRAM_CHAT_ID: chatId,
    isConfigured: !!(token && chatId),
  };
}

/** Vercel build / runtime oncesi zorunlu degisken kontrolu */
export function assertRequiredEnvForDeploy(): void {
  getAuthEnv();
}

/** Cookie guvenlik bayraklari */
export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true as const,
    secure: isSecureDeployment(),
    sameSite: "strict" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Vercel'e eklenecek degisken listesi (dokumantasyon) */
export const VERCEL_ENV_KEYS = [
  "AUTH_USERNAME",
  "AUTH_PASSWORD",
  "JWT_SECRET",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
] as const;
