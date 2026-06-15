import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  addJournalEntry,
  closeJournalEntry,
  deleteJournalEntry,
  listJournalEntries,
  type TradeJournalInput,
} from "@/lib/db/journal-db";
import { getDbMode } from "@/lib/db/client";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const entries = await listJournalEntries(50);
  return NextResponse.json({
    entries,
    storage: getDbMode(),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (body.action === "close") {
      const entry = await closeJournalEntry(String(body.id), Number(body.exitPrice));
      if (!entry) {
        return NextResponse.json({ error: "Kayit bulunamadi." }, { status: 404 });
      }
      return NextResponse.json({ ok: true, entry });
    }

    const input: TradeJournalInput = {
      symbol: String(body.symbol ?? "").toUpperCase(),
      side: body.side === "SELL" ? "SELL" : "BUY",
      quantity: Number(body.quantity),
      entryPrice: Number(body.entryPrice),
      stopLoss: body.stopLoss != null ? Number(body.stopLoss) : undefined,
      takeProfit: body.takeProfit != null ? Number(body.takeProfit) : undefined,
      note: body.note ? String(body.note) : undefined,
    };

    if (
      !input.symbol ||
      !Number.isFinite(input.quantity) ||
      input.quantity <= 0 ||
      !Number.isFinite(input.entryPrice) ||
      input.entryPrice <= 0
    ) {
      return NextResponse.json({ error: "Gecersiz alanlar." }, { status: 400 });
    }

    const entry = await addJournalEntry(input);
    return NextResponse.json({ ok: true, entry });
  } catch {
    return NextResponse.json({ error: "Gecersiz istek." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id gerekli." }, { status: 400 });
  }

  await deleteJournalEntry(id);
  return NextResponse.json({ ok: true });
}
