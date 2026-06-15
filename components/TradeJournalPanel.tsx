"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  calcJournalPnL,
  type TradeJournalEntry,
} from "@/lib/trade-journal";
import { formatMoneyTL, formatSignedMoneyTL } from "@/lib/portfolio";

interface TradeJournalPanelProps {
  prices: { symbol: string; price: number | null }[];
  watchlist: string[];
}

export default function TradeJournalPanel({
  prices,
  watchlist,
}: TradeJournalPanelProps) {
  const [entries, setEntries] = useState<TradeJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState("THYAO");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [note, setNote] = useState("");
  const [closePrices, setClosePrices] = useState<Record<string, string>>({});
  const [syncNote, setSyncNote] = useState("");

  const loadEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/journal");
      if (!res.ok) return;
      const data = await res.json();
      setEntries(data.entries ?? []);
      setSyncNote("Islem gunlugu sunucuda saklanir.");
    } catch {
      setSyncNote("Gunluk yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  function getLivePrice(sym: string) {
    return prices.find((p) => p.symbol === sym)?.price ?? null;
  }

  const totals = useMemo(() => {
    let invested = 0;
    let current = 0;
    let pnl = 0;
    let counted = 0;

    for (const entry of entries) {
      const cost = entry.quantity * entry.entryPrice;
      invested += cost;
      const live = getLivePrice(entry.symbol);
      const { pnlTl } = calcJournalPnL(entry, live);
      if (pnlTl != null) {
        pnl += pnlTl;
        current += entry.side === "BUY" ? cost + pnlTl : cost + pnlTl;
        counted += 1;
      }
    }

    return {
      invested,
      current: counted > 0 ? current : 0,
      pnl: counted > 0 ? pnl : null,
      pnlPercent:
        counted > 0 && invested > 0 ? (pnl / invested) * 100 : null,
    };
  }, [entries, prices]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const qty = parseFloat(quantity);
    const price = parseFloat(entryPrice);
    const sl = stopLoss ? parseFloat(stopLoss) : undefined;
    const tp = takeProfit ? parseFloat(takeProfit) : undefined;
    if (!qty || qty <= 0 || !price || price <= 0) return;

    const res = await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol,
        side,
        quantity: qty,
        entryPrice: price,
        stopLoss: sl,
        takeProfit: tp,
        note,
      }),
    });

    if (!res.ok) return;
    setQuantity("");
    setEntryPrice("");
    setStopLoss("");
    setTakeProfit("");
    setNote("");
    await loadEntries();
  }

  async function handleClose(id: string) {
    const raw = closePrices[id];
    const exitPrice = parseFloat(raw);
    if (!exitPrice || exitPrice <= 0) return;

    await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "close", id, exitPrice }),
    });
    await loadEntries();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/journal?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await loadEntries();
  }

  return (
    <section className="panel-section">
      <h2 className="section-title">Islem Gunlugu</h2>
      <div className="panel-card">
        <form className="journal-form" onSubmit={handleAdd}>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="portfolio-input"
          >
            {watchlist.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={side}
            onChange={(e) => setSide(e.target.value as "BUY" | "SELL")}
            className="portfolio-input journal-side"
          >
            <option value="BUY">Alis</option>
            <option value="SELL">Satis</option>
          </select>
          <input
            type="number"
            step="any"
            min="0"
            placeholder="Adet"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="portfolio-input"
            required
          />
          <input
            type="number"
            step="any"
            min="0"
            placeholder="Fiyat (TL)"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            className="portfolio-input"
            required
          />
          <input
            type="number"
            step="any"
            min="0"
            placeholder="Stop (ops.)"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className="portfolio-input"
          />
          <input
            type="number"
            step="any"
            min="0"
            placeholder="TP (ops.)"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            className="portfolio-input"
          />
          <input
            type="text"
            placeholder="Not (neden aldim?)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="portfolio-input journal-note"
          />
          <button type="submit" className="btn-primary btn-sm" disabled={loading}>
            Kaydet
          </button>
        </form>

        {loading && <p className="panel-empty">Gunluk yukleniyor...</p>}

        {!loading && entries.length === 0 && (
          <p className="panel-empty">
            Gercek islemlerini not, stop ve TP ile kaydet. Midas&apos;ta yaptigin
            islemin kopyasi burada.
          </p>
        )}

        {!loading && entries.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hisse</th>
                    <th>Islem</th>
                    <th>Adet</th>
                    <th>Giris</th>
                    <th>SL / TP</th>
                    <th>K/Z</th>
                    <th>Not</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const live = getLivePrice(entry.symbol);
                    const { pnlTl, pnlPercent } = calcJournalPnL(entry, live);
                    const pnlClass =
                      pnlTl == null ? "" : pnlTl >= 0 ? "pnl-pos" : "pnl-neg";

                    return (
                      <tr key={entry.id}>
                        <td className="cell-bold">{entry.symbol}</td>
                        <td>{entry.side === "BUY" ? "Alis" : "Satis"}</td>
                        <td>{entry.quantity}</td>
                        <td>{entry.entryPrice.toFixed(2)}</td>
                        <td className="journal-levels">
                          {entry.stopLoss?.toFixed(2) ?? "—"} /{" "}
                          {entry.takeProfit?.toFixed(2) ?? "—"}
                        </td>
                        <td className={pnlClass}>
                          {pnlTl != null && pnlPercent != null ? (
                            <>
                              {formatSignedMoneyTL(pnlTl)}
                              <br />
                              <span className="journal-pnl-pct">
                                {pnlPercent >= 0 ? "+" : ""}
                                {pnlPercent.toFixed(2)}%
                              </span>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="journal-note-cell">{entry.note ?? "—"}</td>
                        <td className="journal-actions">
                          {entry.status === "OPEN" && (
                            <div className="journal-close-row">
                              <input
                                type="number"
                                step="any"
                                placeholder="Cikis"
                                value={closePrices[entry.id] ?? ""}
                                onChange={(e) =>
                                  setClosePrices((prev) => ({
                                    ...prev,
                                    [entry.id]: e.target.value,
                                  }))
                                }
                                className="portfolio-input journal-close-input"
                              />
                              <button
                                type="button"
                                className="btn-primary btn-sm"
                                onClick={() => handleClose(entry.id)}
                              >
                                Kapat
                              </button>
                            </div>
                          )}
                          {entry.status === "CLOSED" && (
                            <span className="journal-closed">Kapali</span>
                          )}
                          <button
                            type="button"
                            className="btn-delete"
                            onClick={() => handleDelete(entry.id)}
                            title="Sil"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totals.pnl != null && (
              <div className="portfolio-total-panel journal-totals">
                <div className="portfolio-total-panel-item">
                  <span>Toplam giris</span>
                  <strong>{formatMoneyTL(totals.invested)}</strong>
                </div>
                <div className="portfolio-total-panel-item">
                  <span>Guncel deger</span>
                  <strong>{formatMoneyTL(totals.current)}</strong>
                </div>
                <div
                  className={`portfolio-total-panel-item ${totals.pnl >= 0 ? "pnl-pos" : "pnl-neg"}`}
                >
                  <span>Toplam K/Z</span>
                  <strong>{formatSignedMoneyTL(totals.pnl)}</strong>
                </div>
                <div
                  className={`portfolio-total-panel-item ${(totals.pnlPercent ?? 0) >= 0 ? "pnl-pos" : "pnl-neg"}`}
                >
                  <span>K/Z %</span>
                  <strong>
                    {totals.pnlPercent != null
                      ? `${totals.pnlPercent >= 0 ? "+" : ""}${totals.pnlPercent.toFixed(2)}%`
                      : "—"}
                  </strong>
                </div>
              </div>
            )}
          </>
        )}

        <p className="panel-note">{syncNote}</p>
      </div>
    </section>
  );
}
