"use client";

import { FormEvent, useState } from "react";
import {
  DEFAULT_WATCHLIST,
  isValidBistSymbol,
  MAX_WATCHLIST_SIZE,
  normalizeSymbol,
  sanitizeWatchlist,
} from "@/lib/watchlist";

interface WatchlistPanelProps {
  watchlist: string[];
  onChange: (symbols: string[]) => void;
  onSyncCron: () => Promise<void>;
}

export default function WatchlistPanel({
  watchlist,
  onChange,
  onSyncCron,
}: WatchlistPanelProps) {
  const [newSymbol, setNewSymbol] = useState("");
  const [message, setMessage] = useState("");
  const [syncing, setSyncing] = useState(false);

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    const sym = normalizeSymbol(newSymbol);
    if (!isValidBistSymbol(sym)) {
      setMessage("Gecersiz sembol (ornek: THYAO).");
      return;
    }
    if (watchlist.includes(sym)) {
      setMessage("Bu hisse zaten listede.");
      return;
    }
    if (watchlist.length >= MAX_WATCHLIST_SIZE) {
      setMessage(`En fazla ${MAX_WATCHLIST_SIZE} hisse eklenebilir.`);
      return;
    }
    onChange(sanitizeWatchlist([...watchlist, sym]));
    setNewSymbol("");
    setMessage(`${sym} eklendi.`);
  }

  function handleRemove(symbol: string) {
    if (watchlist.length <= 1) {
      setMessage("En az bir hisse kalmali.");
      return;
    }
    onChange(watchlist.filter((s) => s !== symbol));
    setMessage(`${symbol} cikarildi.`);
  }

  function handleReset() {
    onChange([...DEFAULT_WATCHLIST]);
    setMessage("Varsayilan liste yuklendi.");
  }

  async function handleSyncCron() {
    setSyncing(true);
    try {
      await onSyncCron();
      setMessage("Cron izleme listesi senkronlandi.");
    } catch {
      setMessage("Cron senkron basarisiz.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section className="panel-section">
      <h2 className="section-title">Izleme Listesi</h2>
      <div className="panel-card">
        <form className="watchlist-form" onSubmit={handleAdd}>
          <input
            type="text"
            placeholder="Hisse ekle (ornek: GARAN)"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
            className="portfolio-input"
            maxLength={6}
          />
          <button type="submit" className="btn-primary btn-sm">
            Ekle
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={handleReset}
          >
            Varsayilan
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={handleSyncCron}
            disabled={syncing}
          >
            {syncing ? "Senkron..." : "Cron Senkron"}
          </button>
        </form>

        <div className="watchlist-chips">
          {watchlist.map((symbol) => (
            <span key={symbol} className="watchlist-chip">
              {symbol}
              <button
                type="button"
                className="watchlist-chip-remove"
                onClick={() => handleRemove(symbol)}
                title="Cikar"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {message && <p className="panel-note">{message}</p>}
        <p className="panel-note">
          {watchlist.length} hisse · Cron her 15 dk 5 hisseyi tarar (rotasyon).
        </p>
      </div>
    </section>
  );
}
