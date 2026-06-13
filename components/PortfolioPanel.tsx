"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  calcPnL,
  loadPortfolio,
  newPortfolioId,
  savePortfolio,
  type PortfolioItem,
} from "@/lib/portfolio";

interface PortfolioPanelProps {
  prices: { symbol: string; price: number | null }[];
  watchlist: string[];
}

export default function PortfolioPanel({ prices, watchlist }: PortfolioPanelProps) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [symbol, setSymbol] = useState("THYAO");
  const [quantity, setQuantity] = useState("");
  const [buyPrice, setBuyPrice] = useState("");

  useEffect(() => {
    setItems(loadPortfolio());
  }, []);

  function persist(next: PortfolioItem[]) {
    setItems(next);
    savePortfolio(next);
  }

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    const qty = parseFloat(quantity);
    const price = parseFloat(buyPrice);
    if (!qty || qty <= 0 || !price || price <= 0) return;

    persist([
      ...items,
      {
        id: newPortfolioId(),
        symbol,
        quantity: qty,
        buyPrice: price,
      },
    ]);
    setQuantity("");
    setBuyPrice("");
  }

  function handleDelete(id: string) {
    persist(items.filter((i) => i.id !== id));
  }

  function getLivePrice(sym: string) {
    return prices.find((p) => p.symbol === sym)?.price ?? null;
  }

  let totalCost = 0;
  let totalValue = 0;

  return (
    <section className="panel-section">
      <h2 className="section-title">Sanal Portfoy</h2>
      <div className="panel-card">
        <form className="portfolio-form" onSubmit={handleAdd}>
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
            placeholder="Alis fiyati (TL)"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            className="portfolio-input"
            required
          />
          <button type="submit" className="btn-primary btn-sm">
            Ekle
          </button>
        </form>

        {items.length === 0 ? (
          <p className="panel-empty">
            Henuz pozisyon yok. Hisse adedi ve alis fiyatini yukaridan ekle.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hisse</th>
                  <th>Adet</th>
                  <th>Alis</th>
                  <th>Canli</th>
                  <th>K/Z (TL)</th>
                  <th>K/Z (%)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const live = getLivePrice(item.symbol);
                  const { pnlTl, pnlPercent } = calcPnL(
                    item.quantity,
                    item.buyPrice,
                    live
                  );
                  const cost = item.quantity * item.buyPrice;
                  totalCost += cost;
                  if (live !== null) totalValue += item.quantity * live;

                  const pnlClass =
                    pnlTl === null
                      ? ""
                      : pnlTl >= 0
                        ? "pnl-pos"
                        : "pnl-neg";

                  return (
                    <tr key={item.id}>
                      <td className="cell-bold">{item.symbol}</td>
                      <td>{item.quantity}</td>
                      <td>{item.buyPrice.toFixed(2)}</td>
                      <td>{live !== null ? live.toFixed(2) : "—"}</td>
                      <td className={pnlClass}>
                        {pnlTl !== null
                          ? `${pnlTl >= 0 ? "+" : ""}${pnlTl.toFixed(2)}`
                          : "—"}
                      </td>
                      <td className={pnlClass}>
                        {pnlPercent !== null
                          ? `${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%`
                          : "—"}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-delete"
                          onClick={() => handleDelete(item.id)}
                          title="Sil"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {items.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={4} className="cell-bold">
                      Toplam
                    </td>
                    <td
                      className={
                        totalValue - totalCost >= 0 ? "pnl-pos" : "pnl-neg"
                      }
                    >
                      {totalValue > 0
                        ? `${totalValue - totalCost >= 0 ? "+" : ""}${(totalValue - totalCost).toFixed(2)} TL`
                        : "—"}
                    </td>
                    <td
                      className={
                        totalValue - totalCost >= 0 ? "pnl-pos" : "pnl-neg"
                      }
                    >
                      {totalCost > 0 && totalValue > 0
                        ? `${((totalValue - totalCost) / totalCost) * 100 >= 0 ? "+" : ""}${(((totalValue - totalCost) / totalCost) * 100).toFixed(2)}%`
                        : "—"}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
        <p className="panel-note">
          Veriler tarayicinda saklanir (localStorage). Canli fiyat 5 sn&apos;de bir guncellenir.
        </p>
      </div>
    </section>
  );
}
