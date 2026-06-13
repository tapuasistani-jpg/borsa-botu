"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StockCard from "@/components/StockCard";
import NewsBanner from "@/components/NewsBanner";
import PortfolioPanel from "@/components/PortfolioPanel";
import BacktestPanel from "@/components/BacktestPanel";
import { useTelegramAlerts } from "@/lib/hooks/useTelegramAlerts";
import {
  BABA_KAGITLAR,
  HAREKETLI_KAGITLAR,
  HISSELER,
  type GlobalNewsResult,
  type StockAnalysis,
  type StockNewsResult,
} from "@/lib/stocks";

interface PriceItem {
  symbol: string;
  price: number | null;
  changePercent?: number;
}

export default function DashboardClient({ username }: { username: string }) {
  const router = useRouter();
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
  const [telegramOk, setTelegramOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPrices = useCallback(async () => {
    const res = await fetch("/api/prices");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Fiyat alinamadi.");
    }
    const data = await res.json();
    setPrices(data.prices);
    setLastPriceUpdate(
      new Date(data.updatedAt).toLocaleTimeString("tr-TR")
    );
  }, [router]);

  const fetchAnalysis = useCallback(async () => {
    const map: Record<string, StockAnalysis> = {};

    for (let i = 0; i < HISSELER.length; i += 5) {
      const batch = [...HISSELER].slice(i, i + 5);
      const results = await Promise.all(
        batch.map(async (symbol) => {
          const res = await fetch(`/api/analysis?symbol=${symbol}`);
          if (res.status === 401) {
            router.push("/login");
            return null;
          }
          if (!res.ok) return null;
          const data = await res.json();
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
  }, [router]);

  const fetchNews = useCallback(async () => {
    const globalRes = await fetch("/api/news?scope=global");
    if (globalRes.status === 401) {
      router.push("/login");
      return;
    }
    if (!globalRes.ok) {
      const data = await globalRes.json();
      throw new Error(data.error ?? "Haber analizi alinamadi.");
    }
    const globalData = await globalRes.json();
    setGlobalNews(globalData.global);
    setKeywordBankSize(globalData.keywordBankSize ?? 0);
    setNewsUpdatedAt(globalData.updatedAt ?? "");

    const stocks: Record<string, StockNewsResult> = {};

    for (let i = 0; i < HISSELER.length; i += 5) {
      const batch = [...HISSELER].slice(i, i + 5);
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
  }, [router]);

  useEffect(() => {
    async function init() {
      try {
        await Promise.all([fetchPrices(), fetchAnalysis(), fetchNews()]);
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
  }, [fetchPrices, fetchAnalysis, fetchNews]);

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

    return () => {
      clearInterval(priceInterval);
      clearInterval(analysisInterval);
      clearInterval(newsInterval);
    };
  }, [fetchPrices, fetchAnalysis, fetchNews]);

  useTelegramAlerts({
    analysisMap,
    stockNewsMap,
    globalNews,
    prices,
    enabled: telegramOk && !loading,
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
          </p>
        </div>
        <div className="header-actions">
          <span className="status-badge">
            <span className="status-dot" />
            {telegramOk ? "Telegram Aktif" : "Canli · Ucretsiz"}
          </span>
          <button type="button" className="btn-ghost" onClick={handleLogout}>
            Cikis
          </button>
        </div>
      </header>

      {error && <div className="error-msg">{error}</div>}

      <NewsBanner
        globalNews={globalNews}
        keywordBankSize={keywordBankSize}
        updatedAt={newsUpdatedAt}
      />

      <div className="tools-row">
        <PortfolioPanel prices={prices} />
        <BacktestPanel />
      </div>

      <section>
        <h2 className="section-title">Baba Kagitlar</h2>
        <div className="stock-grid">
          {BABA_KAGITLAR.map((symbol) => {
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
              />
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="section-title">Hareketli Kagitlar</h2>
        <div className="stock-grid">
          {HAREKETLI_KAGITLAR.map((symbol) => {
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
        <span>Teknik + Haber = Ortak Karar · Telegram: GUCULU sinyaller</span>
      </footer>
    </main>
  );
}
