import type { CombinedSignal, CombinedSignalEn } from "./news/types";
import type { StockSectorInfo } from "./sectors";

export type MarketTrend = "UP" | "DOWN" | "FLAT" | "UNKNOWN";

export function getBist100Trend(
  changePercent: number | null | undefined
): MarketTrend {
  if (changePercent === null || changePercent === undefined) return "UNKNOWN";
  if (changePercent <= -1) return "DOWN";
  if (changePercent >= 0.5) return "UP";
  return "FLAT";
}

function isBuySignal(signalEn: CombinedSignalEn): boolean {
  return (
    signalEn === "STRONG BUY" ||
    signalEn === "BUY" ||
    signalEn === "RISKY BUY"
  );
}

function isSellSignal(signalEn: CombinedSignalEn): boolean {
  return signalEn === "STRONG SELL" || signalEn === "SELL";
}

const BUY_DOWNGRADE: Partial<Record<CombinedSignalEn, CombinedSignalEn>> = {
  "STRONG BUY": "BUY",
  BUY: "RISKY BUY",
  "RISKY BUY": "HOLD",
};

const BUY_DOWNGRADE_HARD: Partial<Record<CombinedSignalEn, CombinedSignalEn>> = {
  "STRONG BUY": "RISKY BUY",
  BUY: "HOLD",
  "RISKY BUY": "HOLD",
};

const SIGNAL_TR: Record<CombinedSignalEn, string> = {
  "STRONG BUY": "GUCULU AL",
  BUY: "AL",
  "RISKY BUY": "RISKLI AL",
  HOLD: "DUR",
  NEUTRAL: "BEKLE",
  SELL: "SAT",
  "STRONG SELL": "GUCULU SAT",
};

const SIGNAL_COLOR: Record<
  CombinedSignalEn,
  CombinedSignal["color"]
> = {
  "STRONG BUY": "green",
  BUY: "green",
  "RISKY BUY": "orange",
  HOLD: "yellow",
  NEUTRAL: "yellow",
  SELL: "red",
  "STRONG SELL": "red",
};

function downgradeBuy(
  signal: CombinedSignal,
  map: Partial<Record<CombinedSignalEn, CombinedSignalEn>>,
  note: string
): CombinedSignal {
  const nextEn = map[signal.signalEn as CombinedSignalEn];
  if (!nextEn || nextEn === signal.signalEn) return signal;

  return {
    signalEn: nextEn,
    signalTr: SIGNAL_TR[nextEn],
    color: SIGNAL_COLOR[nextEn],
    reason: `${signal.reason} ${note}`,
  };
}

/** BIST100 + sektor trendine gore AL/SAT sinyallerini ayarla */
export function applyMarketContextFilter(
  signal: CombinedSignal,
  ctx: {
    bist100ChangePercent?: number | null;
    sectorInfo?: StockSectorInfo | null;
  }
): CombinedSignal {
  const bistTrend = getBist100Trend(ctx.bist100ChangePercent);
  const sectorDown = ctx.sectorInfo?.trend === "DOWN";
  const sectorUp = ctx.sectorInfo?.trend === "UP";

  let result = signal;

  if (isBuySignal(result.signalEn)) {
    if (bistTrend === "DOWN" && sectorDown) {
      result = downgradeBuy(
        result,
        BUY_DOWNGRADE_HARD,
        "— BIST100 ve sektor dususte, AL zayiflatildi."
      );
    } else if (bistTrend === "DOWN") {
      result = downgradeBuy(
        result,
        BUY_DOWNGRADE,
        "— BIST100 dususte, AL temkinli mod."
      );
    } else if (sectorDown) {
      result = downgradeBuy(
        result,
        BUY_DOWNGRADE,
        "— Sektor dususte, AL temkinli mod."
      );
    } else if (bistTrend === "UP" && sectorUp && result.signalEn === "BUY") {
      result = {
        ...result,
        signalEn: "STRONG BUY",
        signalTr: SIGNAL_TR["STRONG BUY"],
        color: "green",
        reason: `${result.reason} BIST100 ve sektor yukseliste — AL guclendirildi.`,
      };
    }
  }

  if (
    isSellSignal(result.signalEn) &&
    bistTrend === "UP" &&
    result.signalEn === "SELL"
  ) {
    result = {
      ...result,
      signalEn: "HOLD",
      signalTr: SIGNAL_TR.HOLD,
      color: "yellow",
      reason: `${result.reason} BIST100 yukseliste — SAT sinyali beklemeye alindi.`,
    };
  }

  return result;
}
