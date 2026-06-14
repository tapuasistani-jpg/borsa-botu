import { fetchBist100Quote } from "./bist100";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchYahooFx(ticker: string): Promise<{
  price: number | null;
  changePercent: number | null;
}> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { price: null, changePercent: null };

    const data = (await res.json()) as {
      chart?: {
        result?: {
          meta?: {
            regularMarketPrice?: number;
            chartPreviousClose?: number;
          };
        }[];
      };
    };

    const meta = data.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    if (typeof price !== "number") {
      return { price: null, changePercent: null };
    }

    const prev = meta?.chartPreviousClose;
    let changePercent: number | null = null;
    if (typeof prev === "number" && prev > 0) {
      changePercent = ((price - prev) / prev) * 100;
    }

    return { price, changePercent };
  } catch {
    return { price: null, changePercent: null };
  }
}

export interface MacroSnapshot {
  usdTry: number | null;
  usdTryChangePercent: number | null;
  bist100ChangePercent: number | null;
  policyRatePercent: number | null;
  policyRateSource: "tcmb" | "env" | "unknown";
  updatedAt: string;
}

function parsePolicyRateFromHtml(html: string): number | null {
  const patterns = [
    /Politika Faizi[^0-9]*(\d+[.,]\d+)/i,
    /1 Hafta[^0-9]*(\d+[.,]\d+)/i,
    /policy rate[^0-9]*(\d+[.,]\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const value = parseFloat(match[1].replace(",", "."));
      if (Number.isFinite(value) && value > 0 && value < 100) {
        return value;
      }
    }
  }

  return null;
}

async function fetchTcmbPolicyRate(): Promise<{
  rate: number | null;
  source: MacroSnapshot["policyRateSource"];
}> {
  const envRate = process.env.TCMB_POLICY_RATE?.trim();
  if (envRate) {
    const parsed = parseFloat(envRate.replace(",", "."));
    if (Number.isFinite(parsed)) {
      return { rate: parsed, source: "env" };
    }
  }

  try {
    const res = await fetch(
      "https://www.tcmb.gov.tr/wps/wcm/connect/tr/tcmb+tr/main+menu/merkez+bankasi+politikasi/faiz+oranlari/politika+faizi",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; BorsaBotu/1.0)",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      }
    );

    if (res.ok) {
      const html = await res.text();
      const rate = parsePolicyRateFromHtml(html);
      if (rate !== null) {
        return { rate, source: "tcmb" };
      }
    }
  } catch {
    // fallback below
  }

  return { rate: null, source: "unknown" };
}

export async function fetchMacroSnapshot(): Promise<MacroSnapshot> {
  const [usd, bist100, policy] = await Promise.all([
    fetchYahooFx("USDTRY=X"),
    fetchBist100Quote(),
    fetchTcmbPolicyRate(),
  ]);

  return {
    usdTry: usd.price,
    usdTryChangePercent: usd.changePercent,
    bist100ChangePercent: bist100?.changePercent ?? null,
    policyRatePercent: policy.rate,
    policyRateSource: policy.source,
    updatedAt: new Date().toISOString(),
  };
}
