import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sanitizePortfolio, type PortfolioItem } from "@/lib/portfolio";
import {
  loadServerPortfolio,
  saveServerPortfolio,
} from "@/lib/portfolio-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const items = loadServerPortfolio();
  return NextResponse.json({
    items,
    updatedAt: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const items = sanitizePortfolio(
      Array.isArray(body.items) ? body.items : []
    ) as PortfolioItem[];

    saveServerPortfolio(items);
    return NextResponse.json({
      ok: true,
      items,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Gecersiz istek." }, { status: 400 });
  }
}
