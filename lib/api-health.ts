export type HealthStatus = "ok" | "warn" | "error";

export interface ApiHealthSlice {
  status: HealthStatus;
  label: string;
  lastUpdate: string | null;
  message?: string;
}

export interface ApiHealthState {
  overall: HealthStatus;
  prices: ApiHealthSlice;
  analysis: ApiHealthSlice;
  news: ApiHealthSlice;
  kap: ApiHealthSlice;
}

export function createInitialHealth(): ApiHealthState {
  return {
    overall: "warn",
    prices: { status: "warn", label: "Fiyat", lastUpdate: null },
    analysis: { status: "warn", label: "Analiz", lastUpdate: null },
    news: { status: "warn", label: "Haber", lastUpdate: null },
    kap: { status: "warn", label: "KAP", lastUpdate: null },
  };
}

function deriveOverall(slices: ApiHealthSlice[]): HealthStatus {
  if (slices.some((s) => s.status === "error")) return "error";
  if (slices.some((s) => s.status === "warn")) return "warn";
  return "ok";
}

export function markHealthSuccess(
  state: ApiHealthState,
  key: "prices" | "analysis" | "news" | "kap",
  updatedAt?: string
): ApiHealthState {
  const next = {
    ...state,
    [key]: {
      ...state[key],
      status: "ok" as const,
      lastUpdate: updatedAt ?? new Date().toISOString(),
      message: undefined,
    },
  };
  next.overall = deriveOverall([
    next.prices,
    next.analysis,
    next.news,
    next.kap,
  ]);
  return next;
}

export function markHealthError(
  state: ApiHealthState,
  key: "prices" | "analysis" | "news" | "kap",
  message: string
): ApiHealthState {
  const next = {
    ...state,
    [key]: {
      ...state[key],
      status: "error" as const,
      message,
    },
  };
  next.overall = deriveOverall([
    next.prices,
    next.analysis,
    next.news,
    next.kap,
  ]);
  return next;
}

export function formatHealthTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("tr-TR");
  } catch {
    return "—";
  }
}
