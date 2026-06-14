"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StockCard from "@/components/StockCard";
import NewsBanner from "@/components/NewsBanner";
import PortfolioPanel from "@/components/PortfolioPanel";
import BacktestPanel from "@/components/BacktestPanel";
import MarketOverviewPanel from "@/components/MarketOverviewPanel";
import SuccessScoreBadge from "@/components/SuccessScoreBadge";
import MarketStatusBar from "@/components/MarketStatusBar";
import ApiHealthBadge from "@/components/ApiHealthBadge";
import WatchlistPanel from "@/components/WatchlistPanel";
import DataBackupPanel from "@/components/DataBackupPanel";
import MacroPanel from "@/components/MacroPanel";
import KapAlertsPanel from "@/components/KapAlertsPanel";
import CronStatusBadge, {
  type CronStatusData,
} from "@/components/CronStatusBadge";
import type { MacroSnapshot } from "@/lib/macro";
import type { KapDisclosure } from "@/lib/kap/types";
import { useTelegramAlerts } from "@/lib/hooks/useTelegramAlerts";
import { usePriceLevelAlerts } from "@/lib/hooks/usePriceLevelAlerts";
import { useTradeLevelSync } from "@/lib/hooks/useTradeLevelSync";
import { useSignalHistory } from "@/lib/hooks/useSignalHistory";
import {
  createInitialHealth,
  markHealthError,
  markHealthSuccess,
  type ApiHealthState,
} from "@/lib/api-health";
import { compareToBist100 } from "@/lib/bist100";
import { buildMarketOverview } from "@/lib/market-overview";
import { computeSectorTrends } from "@/lib/sectors";
import {
  loadWatchlist,
  saveWatchlist,
  sanitizeWatchlist,
} from "@/lib/watchlist";
import type {
  GlobalNewsResult,
  StockAnalysis,
  StockNewsResult,
} from "@/lib/stocks";

interface PriceItem {
  symbol: string;
  price: number | null;
  changePercent?: number;
}

const BATCH = 5;

function symbolsQuery(symbols: string[]) {
  return encodeURIComponent(symbols.join(","));
}

export default function DashboardClient({ username }: { username: string }) {
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<string[]>(() => loadWatchlist());
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [analysisMap, setAnalysisMap] = useState<
    Record<string, StockAnalysis>
  >({});
  const [stockNewsMap, setStockNewsMap] = useState<
    Record<string, StockNewsResult>
  >({});
  const [globalNews, setGlobalNews] = useState<GlobalNewsResult | null>(null);
  const [keywordBankSize, setKeywordBankSize] = useState(0);
  const [newsUpdatedAt, setNewsUpdatedAt] = useState("");
  const [lastPriceUpdate, setLastPriceUpdate] = useState("");
  const [bist100Change, setBist100Change] = useState<number | null>(null);
  const [telegramOk, setTelegramOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [health, setHealth] = useState<ApiHealthState>(createInitialHealth());
  const [macro, setMacro] = useState<MacroSnapshot | null>(null);
  const [macroLoading, setMacroLoading] = useState(true);
  const [kapFeeds, setKapFeeds] = useState<Record<string, KapDisclosure[]>>({});
  const [kapLoading, setKapLoading] = useState(true);
  const [cronStatus, setCronStatus] = useState<CronStatusData | null>(null);
  const [cronLoading, setCronLoading] = useState(true);

  const handleWatchlistChange = useCallback((symbols: string[]) => {
    const next = sanitizeWatchlist(symbols);
    setWatchlist(next);
    saveWatchlist(next);
    fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols: next }),
    }).catch(() => {});
  }, []);

  const syncCronWatchlist = useCallback(async () => {
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols: watchlist }),
    });
    if (!res.ok) throw new Error("Cron sync failed");
  }, [watchlist]);

  const fetchPrices = useCallback(async () => {
    const res = await fetch(`/api/prices?symbols=${symbolsQuery(watchlist)}`);
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    if (!res.ok && !data.prices) {
      setHealth((h) =>
        markHealthError(h, "prices", data.error ?? "Fiyat hatasi")
      );
      throw new Error(data.error ?? "Fiyat alinamadi.");
    }
    setPrices(data.prices ?? []);
    if (data.updatedAt) {
      setLastPriceUpdate(
        new Date(data.updatedAt).toLocaleTimeString("tr-TR")
      );
      setHealth((h) => markHealthSuccess(h, "prices", data.updatedAt));
    }
    if (data.warning) {
      setHealth((h) => markHealthError(h, "prices", data.warning));
    }
  }, [router, watchlist]);

  const fetchBist100 = useCallback(async () => {
    const res = await fetch("/api/bist100");
    if (!res.ok) return;
    const data = await res.json();
    if (typeof data.changePercent === "number") {
      setBist100Change(data.changePercent);
    }
  }, []);

  const fetchMacro = useCallback(async () => {
    try {
      const res = await fetch("/api/macro");
      if (!res.ok) return;
      const data = (await res.json()) as MacroSnapshot;
      setMacro(data);
    } finally {
      setMacroLoading(false);
    }
  }, []);

  const fetchKap = useCallback(async () => {
    if (watchlist.length === 0) {
      setKapFeeds({});
      setKapLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/kap?symbols=${symbolsQuery(watchlist)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setKapFeeds(data.feeds ?? {});
    } finally {
      setKapLoading(false);
    }
  }, [watchlist]);

  const fetchCronStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/cron/status");
      if (!res.ok) return;
      const data = (await res.json()) as CronStatusData;
      setCronStatus(data);
    } finally {
      setCronLoading(false);
    }
  }, []);

  const fetchAnalysis = useCallback(async () => {
    const map: Record<string, StockAnalysis> = {};
    let lastUpdated: string | null = null;

    for (let i = 0; i < watchlist.length; i += BATCH) {
      const batch = watchlist.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(async (symbol) => {
          const res = await fetch(`/api/analysis?symbol=${symbol}`);
          if (res.status === 401) {
            router.push("/login");
            return null;
          }
          if (!res.ok) return null;
          const data = await res.json();
          lastUpdated = data.updatedAt ?? lastUpdated;
          const item = data.analysis?.[0];
          if (item && !("error" in item)) return item as StockAnalysis;
          return null;
        })
      );
      results.forEach((item) => {
        if (item) map[item.symbol] = item;
      });
    }

    setAnalysisMap(map);
    if (lastUpdated) {
      setHealth((h) => markHealthSuccess(h, "analysis", lastUpdated!));
    }
  }, [router, watchlist]);

  const fetchNews = useCallback(async () => {
    const globalRes = await fetch("/api/news?scope=global");
    if (globalRes.status === 401) {
      router.push("/login");
      return;
    }
    if (!globalRes.ok) {
      const data = await globalRes.json();
      setHealth((h) =>
        markHealthError(h, "news", data.error ?? "Haber hatasi")
      );
      throw new Error(data.error ?? "Haber analizi alinamadi.");
    }
    const globalData = await globalRes.json();
    setGlobalNews(globalData.global);
    setKeywordBankSize(globalData.keywordBankSize ?? 0);
    setNewsUpdatedAt(globalData.updatedAt ?? "");
    setHealth((h) =>
      markHealthSuccess(h, "news", globalData.updatedAt ?? new Date().toISOString())
    );

    const stocks: Record<string, StockNewsResult> = {};

    for (let i = 0; i < watchlist.length; i += BATCH) {
      const batch = watchlist.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(async (symbol) => {
          const res = await fetch(`/api/news?symbol=${symbol}`);
          if (!res.ok) return null;
          const data = await res.json();
          return data.stocks?.[symbol] as StockNewsResult | undefined;
        })
      );
      batch.forEach((sym, idx) => {
        if (results[idx]) stocks[sym] = results[idx]!;
      });
    }

    setStockNewsMap(stocks);
    setNewsUpdatedAt(new Date().toLocaleTimeString("tr-TR"));
  }, [router, watchlist]);

  useEffect(() => {
    async function init() {
      try {
        await Promise.all([
          fetchPrices(),
          fetchAnalysis(),
          fetchNews(),
          fetchBist100(),
          fetchMacro(),
          fetchKap(),
          fetchCronStatus(),
        ]);
        const tg = await fetch("/api/telegram/send");
        if (tg.ok) {
          const d = await tg.json();
          setTelegramOk(d.configured === true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Veri yuklenemedi.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [fetchPrices, fetchAnalysis, fetchNews, fetchBist100, fetchMacro, fetchKap, fetchCronStatus]);

  const watchlistReady = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!watchlistReady.current) {
      watchlistReady.current = true;
      return;
    }
    Promise.all([fetchPrices(), fetchAnalysis(), fetchNews(), fetchKap()]).catch(
      () => {}
    );
  }, [watchlist, loading, fetchPrices, fetchAnalysis, fetchNews]);

  useEffect(() => {
    const priceInterval = setInterval(() => {
      fetchPrices().catch(() => {});
    }, 5000);

    const analysisInterval = setInterval(() => {
      fetchAnalysis().catch(() => {});
    }, 300000);

    const newsInterval = setInterval(() => {
      fetchNews().catch(() => {});
    }, 900000);

    const bistInterval = setInterval(() => {
      fetchBist100().catch(() => {});
    }, 300000);

    const macroInterval = setInterval(() => {
      fetchMacro().catch(() => {});
    }, 600000);

    const kapInterval = setInterval(() => {
      fetchKap().catch(() => {});
    }, 900000);

    const cronInterval = setInterval(() => {
      fetchCronStatus().catch(() => {});
    }, 120000);

    return () => {
      clearInterval(priceInterval);
      clearInterval(analysisInterval);
      clearInterval(newsInterval);
      clearInterval(bistInterval);
      clearInterval(macroInterval);
      clearInterval(kapInterval);
      clearInterval(cronInterval);
    };
  }, [fetchPrices, fetchAnalysis, fetchNews, fetchBist100, fetchMacro, fetchKap, fetchCronStatus]);

  const sectorTrends = useMemo(
    () => computeSectorTrends(prices, analysisMap),
    [prices, analysisMap]
  );

  const marketOverview = useMemo(
    () =>
      buildMarketOverview(globalNews, prices, analysisMap, sectorTrends),
    [globalNews, prices, analysisMap, sectorTrends]
  );

  const successScore = useSignalHistory({
    watchlist,
    analysisMap,
    stockNewsMap,
    globalNews,
    prices,
    sectorTrends,
    enabled: !loading,
  });

  useTelegramAlerts({
    watchlist,
    analysisMap,
    stockNewsMap,
    globalNews,
    prices,
    sectorTrends,
    enabled: telegramOk && !loading,
  });

  usePriceLevelAlerts({
    watchlist,
    analysisMap,
    stockNewsMap,
    globalNews,
    prices,
    sectorTrends,
    enabled: telegramOk && !loading,
  });

  useTradeLevelSync({
    watchlist,
    analysisMap,
    stockNewsMap,
    globalNews,
    prices,
    sectorTrends,
    enabled: !loading,
  });

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function getPrice(symbol: string) {
    return prices.find((p) => p.symbol === symbol);
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Veriler ve haber analizi yukleniyor...</p>
      </div>
    );
  }

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>BIST Canli Dashboard</h1>
          <p className="subtitle">
            Hos geldin, {username} · Fiyat: {lastPriceUpdate || "—"}
            {bist100Change !== null && (
              <> · BIST100: {bist100Change >= 0 ? "+" : ""}
              {bist100Change.toFixed(2)}%</>
            )}
          </p>
        </div>
        <div className="header-actions">
          <SuccessScoreBadge score={successScore} />
          <span className="status-badge">
            <span className="status-dot" />
            {telegramOk ? "Telegram 7/24 (Cron)" : "Canli · Ucretsiz"}
          </span>
          <button type="button" className="btn-ghost" onClick={handleLogout}>
            Cikis
          </button>
        </div>
      </header>

      <MarketStatusBar />
      <ApiHealthBadge health={health} />

      <div className="top-panels-row">
        <MacroPanel macro={macro} loading={macroLoading} />
        <CronStatusBadge data={cronStatus} loading={cronLoading} />
      </div>

      {error && <div className="error-msg">{error}</div>}

      <NewsBanner
        globalNews={globalNews}
        keywordBankSize={keywordBankSize}
        updatedAt={newsUpdatedAt}
      />

      <MarketOverviewPanel overview={marketOverview} />

      <KapAlertsPanel feeds={kapFeeds} loading={kapLoading} />

      <div className="tools-row tools-row-wide">
        <WatchlistPanel
          watchlist={watchlist}
          onChange={handleWatchlistChange}
          onSyncCron={syncCronWatchlist}
        />
        <DataBackupPanel onImported={() => setWatchlist(loadWatchlist())} />
      </div>

      <div className="tools-row">
        <PortfolioPanel prices={prices} watchlist={watchlist} />
        <BacktestPanel watchlist={watchlist} />
      </div>

      <section>
        <h2 className="section-title">Izleme Listem ({watchlist.length})</h2>
        <div className="stock-grid">
          {watchlist.map((symbol) => {
            const p = getPrice(symbol);
            return (
              <StockCard
                key={symbol}
                symbol={symbol}
                price={p?.price ?? null}
                changePercent={p?.changePercent}
                analysis={analysisMap[symbol] ?? null}
                stockNews={stockNewsMap[symbol] ?? null}
                globalNews={globalNews}
                sectorTrends={sectorTrends}
                bist100Comparison={compareToBist100(
                  p?.changePercent,
                  bist100Change
                )}
              />
            );
          })}
        </div>
      </section>

      <footer className="legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "var(--green)" }} />
          AL / GUCULU AL
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "var(--orange)" }} />
          RISKLI AL
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "var(--yellow)" }} />
          DUR / BEKLE
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "var(--red)" }} />
          SAT / GUCULU SAT
        </span>
        <span>Cron 15dk · KAP · SL/TP alarm · TradingView</span>
        <span className="legend-author">Emre ARSLAN</span>
      </footer>
    </main>
  );
}
