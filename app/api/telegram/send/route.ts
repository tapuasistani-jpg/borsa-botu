import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isTelegramConfigured, sendTelegramAlert } from "@/lib/telegram/send";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  if (!isTelegramConfigured()) {
    return NextResponse.json(
      { error: "Telegram bot ayarlanmamis. .env.local dosyasini kontrol et." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const signalEn = String(body.signalEn ?? "");

    if (signalEn !== "STRONG BUY" && signalEn !== "STRONG SELL") {
      return NextResponse.json(
        { error: "Sadece GUCULU AL / GUCULU SAT sinyalleri gonderilir." },
        { status: 400 }
      );
    }

    const result = await sendTelegramAlert({
      symbol: String(body.symbol ?? ""),
      signalEn,
      signalTr: String(body.signalTr ?? ""),
      price: body.price !== null && body.price !== undefined ? Number(body.price) : null,
      reason: String(body.reason ?? ""),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gecersiz istek." }, { status: 400 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  return NextResponse.json({ configured: isTelegramConfigured() });
}
