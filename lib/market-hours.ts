/** Yahoo Finance verisi yaklasik gecikme (dakika) */
export const DATA_DELAY_MINUTES = 15;

export type MarketSession = "OPEN" | "CLOSED" | "PRE_MARKET";

export interface MarketStatus {
  session: MarketSession;
  label: string;
  detail: string;
  dataDelayLabel: string;
}

function istanbulParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { weekday, minutes: hour * 60 + minute };
}

export function getMarketStatus(now = new Date()): MarketStatus {
  const { weekday, minutes } = istanbulParts(now);
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  const openMinutes = 10 * 60;
  const closeMinutes = 18 * 60;
  const dataDelayLabel = `Veri gecikmesi ~${DATA_DELAY_MINUTES} dk`;

  if (!isWeekday) {
    return {
      session: "CLOSED",
      label: "Piyasa Kapali",
      detail: "Hafta sonu — BIST islem yok",
      dataDelayLabel,
    };
  }

  if (minutes >= openMinutes && minutes < closeMinutes) {
    return {
      session: "OPEN",
      label: "Piyasa Acik",
      detail: "BIST seans aktif (10:00–18:00)",
      dataDelayLabel,
    };
  }

  if (minutes < openMinutes) {
    return {
      session: "PRE_MARKET",
      label: "Piyasa Kapali",
      detail: "Seans oncesi — acilis 10:00",
      dataDelayLabel,
    };
  }

  return {
    session: "CLOSED",
    label: "Piyasa Kapali",
    detail: "Gunluk seans sona erdi",
    dataDelayLabel,
  };
}
