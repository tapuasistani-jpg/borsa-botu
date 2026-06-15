"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
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
  const [syncNote, setSyncNote] = useState("");
  const [loading, setLoading] = useState(true);
  const syncedRef = useRef(false);

  const syncToServer = useCallback(async (next: PortfolioItem[]) => {
    const res = await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: next }),
    });
    if (!res.ok) throw new Error("sync failed");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const res = await fetch("/api/portfolio");
        if (res.status === 401) return;

        const local = loadPortfolio();

        if (res.ok) {
          const data = await res.json();
          const serverItems = (data.items ?? []) as PortfolioItem[];

          if (serverItems.length > 0) {
            if (!cancelled) {
              setItems(serverItems);
              savePortfolio(serverItems);
              setSyncNote("Hesap portfoyu yuklendi (tum cihazlarda ayni).");
            }
          } else if (local.length > 0 && !syncedRef.current) {
            syncedRef.current = true;
            await syncToServer(local);
            if (!cancelled) {
              setItems(local);
              setSyncNote("Yerel portfoy sunucuya aktarildi.");
            }
          } else if (!cancelled) {
            setItems(local);
          }
        } else if (!cancelled) {
          setItems(local);
        }
      } catch {
        if (!cancelled) {
          setItems(loadPortfolio());
          setSyncNote("Sunucu senkronu basarisiz — yerel veri kullaniliyor.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [syncToServer]);

  async function persist(next: PortfolioItem[]) {
    setItems(next);
    savePortfolio(next);
    try {
      await syncToServer(next);
      setSyncNote("Kaydedildi · tum cihazlarda guncel.");
    } catch {
      setSyncNote("Yerel kayit OK — sunucu senkronu basarisiz.");
    }
  }

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    const qty = parseFloat(quantity);
    const price = parseFloat(buyPrice);
    if (!qty || qty <= 0 || !price || price <= 0) return;

    void persist([
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
    void persist(items.filter((i) => i.id !== id));
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
          <button type="submit" className="btn-primary btn-sm" disabled={loading}>
            Ekle
          </button>
        </form>

        {loading && (
          <p className="panel-empty">Portfoy senkron yukleniyor...</p>
        )}

        {!loading && items.length === 0 && (
          <p className="panel-empty">
            Henuz pozisyon yok. Hisse adedi ve alis fiyatini yukaridan ekle.
          </p>
        )}

        {!loading && items.length > 0 && (
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
          {syncNote ||
            "Portfoy hesabinla senkron · farkli PC/telefondan girince ayni liste gelir."}
        </p>
      </div>
    </section>
  );
}
