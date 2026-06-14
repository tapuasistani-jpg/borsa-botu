import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchMacroSnapshot } from "@/lib/macro";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  try {
    const macro = await fetchMacroSnapshot();
    return NextResponse.json(macro);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Makro veri alinamadi.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
