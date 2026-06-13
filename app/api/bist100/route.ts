import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBist100Quote } from "@/lib/bist100";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const quote = await fetchBist100Quote();
  if (!quote) {
    return NextResponse.json(
      { error: "BIST100 verisi alinamadi." },
      { status: 503 }
    );
  }

  return NextResponse.json(quote);
}
