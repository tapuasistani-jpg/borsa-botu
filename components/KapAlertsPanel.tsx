"use client";

import { useEffect, useMemo, useState } from "react";
import type { KapDisclosure } from "@/lib/kap/types";

const KAP_SEEN_UI_KEY = "borsa_kap_seen_ui";

interface KapAlertsPanelProps {
  feeds: Record<string, KapDisclosure[]>;
  loading?: boolean;
}

function loadSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(KAP_SEEN_UI_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(list);
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>) {
  localStorage.setItem(KAP_SEEN_UI_KEY, JSON.stringify([...ids].slice(-200)));
}

export default function KapAlertsPanel({
  feeds,
  loading,
}: KapAlertsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => new Set());

  const flat = useMemo(
    () =>
      Object.entries(feeds)
        .flatMap(([symbol, items]) =>
          items.map((item) => ({ ...item, symbol }))
        )
        .sort((a, b) => {
          if (Boolean(a.priority) !== Boolean(b.priority)) {
            return Number(b.priority) - Number(a.priority);
          }
          const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
          const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
          return tb - ta;
        })
        .slice(0, 12),
    [feeds]
  );

  useEffect(() => {
    setSeenIds(loadSeenIds());
  }, []);

  const newCount = useMemo(
    () => flat.filter((item) => !seenIds.has(item.id)).length,
    [flat, seenIds]
  );

  function toggleExpanded() {
    setExpanded((prev) => {
      const next = !prev;
      if (next && flat.length > 0) {
        const merged = new Set(seenIds);
        for (const item of flat) merged.add(item.id);
        setSeenIds(merged);
        saveSeenIds(merged);
      }
      return next;
    });
  }

  return (
    <section className="kap-panel kap-accordion">
      <button
        type="button"
        className="kap-accordion-trigger"
        onClick={toggleExpanded}
        aria-expanded={expanded}
      >
        <div className="kap-panel-header">
          <h2 className="section-title section-title-inline">KAP Uyarilari</h2>
          <div className="kap-accordion-meta">
            <span className="kap-badge">Izleme listesi</span>
            {!loading && newCount > 0 && (
              <span className="kap-new-badge" aria-label={`${newCount} yeni KAP`}>
                {newCount}
              </span>
            )}
            <span className="kap-chevron">{expanded ? "▲" : "▼"}</span>
          </div>
        </div>
        {!expanded && !loading && flat.length > 0 && (
          <p className="kap-collapsed-hint">
            {newCount > 0
              ? `${newCount} yeni bildirim · acmak icin tikla`
              : `${flat.length} bildirim · acmak icin tikla`}
          </p>
        )}
      </button>

      {expanded && (
        <div className="kap-accordion-body">
          {loading && (
            <p className="kap-empty">KAP bildirimleri yukleniyor...</p>
          )}

          {!loading && flat.length === 0 && (
            <p className="kap-empty">
              Son gunlerde izleme listesindeki hisseler icin KAP kaydi
              bulunamadi.
            </p>
          )}

          {!loading && flat.length > 0 && (
            <ul className="kap-list">
              {flat.map((item) => {
                const isNew = !seenIds.has(item.id);
                return (
                  <li
                    key={`${item.symbol}-${item.id}`}
                    className={`kap-item ${isNew ? "kap-item-new" : ""}`}
                  >
                    <div className="kap-item-top">
                      <span className="kap-symbol">{item.symbol}</span>
                      {item.categoryLabel && (
                        <span
                          className={`kap-cat-badge ${item.priority ? "kap-cat-priority" : ""}`}
                        >
                          {item.categoryLabel}
                        </span>
                      )}
                      {isNew && <span className="kap-item-new-tag">Yeni</span>}
                      {item.publishedAt && (
                        <span className="kap-date">
                          {new Date(item.publishedAt).toLocaleDateString("tr-TR")}
                        </span>
                      )}
                    </div>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="kap-title"
                    >
                      {item.title}
                    </a>
                    <span className="kap-source">
                      {item.source === "kap" ? "KAP API" : "KAP · Google News"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
