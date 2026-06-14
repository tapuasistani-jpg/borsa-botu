import type { TradeLevels } from "./trade-levels";

export type PriceAlertKind = "STOP_LOSS" | "TAKE_PROFIT";

export interface PriceAlertTrigger {
  symbol: string;
  kind: PriceAlertKind;
  price: number;
  level: number;
  stopLoss: number;
  takeProfit: number;
}

export interface PriceAlertStateEntry {
  slTriggered?: boolean;
  tpTriggered?: boolean;
}

export type PriceAlertState = Record<string, PriceAlertStateEntry>;

const SL_RESET_RATIO = 1.02;
const TP_RESET_RATIO = 0.98;

export function resetPriceAlertState(
  symbol: string,
  price: number,
  levels: TradeLevels,
  state: PriceAlertState
): PriceAlertState {
  const entry = { ...(state[symbol] ?? {}) };

  if (entry.slTriggered && price > levels.stopLoss * SL_RESET_RATIO) {
    entry.slTriggered = false;
  }
  if (entry.tpTriggered && price < levels.takeProfit * TP_RESET_RATIO) {
    entry.tpTriggered = false;
  }

  return { ...state, [symbol]: entry };
}

export function checkPriceLevelAlerts(
  symbol: string,
  price: number,
  levels: TradeLevels,
  state: PriceAlertState
): { trigger: PriceAlertTrigger | null; nextState: PriceAlertState } {
  let entry = { ...(state[symbol] ?? {}) };
  let nextState = { ...state, [symbol]: entry };

  nextState = resetPriceAlertState(symbol, price, levels, nextState);
  entry = { ...(nextState[symbol] ?? {}) };

  if (price <= levels.stopLoss && !entry.slTriggered) {
    entry.slTriggered = true;
    return {
      trigger: {
        symbol,
        kind: "STOP_LOSS",
        price,
        level: levels.stopLoss,
        stopLoss: levels.stopLoss,
        takeProfit: levels.takeProfit,
      },
      nextState: { ...nextState, [symbol]: entry },
    };
  }

  if (price >= levels.takeProfit && !entry.tpTriggered) {
    entry.tpTriggered = true;
    return {
      trigger: {
        symbol,
        kind: "TAKE_PROFIT",
        price,
        level: levels.takeProfit,
        stopLoss: levels.stopLoss,
        takeProfit: levels.takeProfit,
      },
      nextState: { ...nextState, [symbol]: entry },
    };
  }

  return { trigger: null, nextState: { ...nextState, [symbol]: entry } };
}
