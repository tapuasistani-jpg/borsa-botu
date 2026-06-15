import type { KapDisclosure } from "./types";
import { isPriorityKapTitle } from "./classify";
import {
  loadKapSeenIds,
  saveKapSeenIds,
} from "@/lib/cron/telegram-state";
import { sendTelegramKapAlert } from "@/lib/telegram/send";

const MAX_SEEN_PER_SYMBOL = 40;

export async function processKapAlerts(
  symbol: string,
  items: KapDisclosure[]
): Promise<{ sent: number; newItems: KapDisclosure[] }> {
  if (items.length === 0) {
    return { sent: 0, newItems: [] };
  }

  const seenState = await loadKapSeenIds();
  const seen = new Set(seenState[symbol] ?? []);
  const priorityItems = items.filter((item) => item.priority ?? isPriorityKapTitle(item.title));
  const newItems = priorityItems.filter((item) => !seen.has(item.id));

  if (newItems.length === 0) {
    return { sent: 0, newItems: [] };
  }

  let sent = 0;
  for (const item of newItems.slice(0, 3)) {
    const prefix = item.categoryLabel ? `[${item.categoryLabel}] ` : "";
    const result = await sendTelegramKapAlert({
      symbol,
      title: `${prefix}${item.title}`,
      link: item.link,
    });
    if (result.ok) sent++;
  }

  const nextSeen = [
    ...newItems.map((i) => i.id),
    ...(seenState[symbol] ?? []),
  ].slice(0, MAX_SEEN_PER_SYMBOL);

  seenState[symbol] = nextSeen;
  await saveKapSeenIds(seenState);

  return { sent, newItems };
}

export async function seedKapSeen(symbol: string, items: KapDisclosure[]) {
  const seenState = await loadKapSeenIds();
  if ((seenState[symbol] ?? []).length > 0) return;

  seenState[symbol] = items.slice(0, 5).map((i) => i.id);
  await saveKapSeenIds(seenState);
}
