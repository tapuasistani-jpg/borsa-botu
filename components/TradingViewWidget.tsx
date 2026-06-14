"use client";

import { useEffect, useRef } from "react";

interface TradingViewWidgetProps {
  symbol: string;
  height?: number;
}

export default function TradingViewWidget({
  symbol,
  height = 220,
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    node.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container__widget";
    wrapper.style.height = `${height}px`;
    node.appendChild(wrapper);

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({
      symbol: `BIST:${symbol}`,
      width: "100%",
      height: "100%",
      locale: "tr",
      dateRange: "1M",
      colorTheme: "dark",
      isTransparent: true,
      autosize: true,
      largeChartUrl: "",
      chartOnly: false,
    });
    node.appendChild(script);

    return () => {
      node.innerHTML = "";
    };
  }, [symbol, height]);

  return (
    <div className="tradingview-wrap">
      <div className="tradingview-widget-container" ref={containerRef} />
    </div>
  );
}
