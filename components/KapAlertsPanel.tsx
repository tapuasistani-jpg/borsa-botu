"use client";

import type { KapDisclosure } from "@/lib/kap/types";

interface KapAlertsPanelProps {
  feeds: Record<string, KapDisclosure[]>;
  loading?: boolean;
}

export default function KapAlertsPanel({
  feeds,
  loading,
}: KapAlertsPanelProps) {
  const flat = Object.entries(feeds)
    .flatMap(([symbol, items]) =>
      items.map((item) => ({ ...item, symbol }))
    )
    .sort((a, b) => {
      const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return tb - ta;
    })
    .slice(0, 12);

  return (
    <section className="kap-panel">
      <div className="kap-panel-header">
        <h2 className="section-title section-title-inline">KAP Uyarilari</h2>
        <span className="kap-badge">Izleme listesi</span>
      </div>

      {loading && <p className="kap-empty">KAP bildirimleri yukleniyor...</p>}

      {!loading && flat.length === 0 && (
        <p className="kap-empty">
          Son gunlerde izleme listesindeki hisseler icin KAP kaydi bulunamadi.
        </p>
      )}

      {!loading && flat.length > 0 && (
        <ul className="kap-list">
          {flat.map((item) => (
            <li key={`${item.symbol}-${item.id}`} className="kap-item">
              <div className="kap-item-top">
                <span className="kap-symbol">{item.symbol}</span>
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
          ))}
        </ul>
      )}
    </section>
  );
}
