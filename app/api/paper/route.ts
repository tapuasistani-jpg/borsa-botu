import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getPaperSnapshot,
  resetPaperAccount,
  setPaperEnabled,
} from "@/lib/paper-trading";
import { getDbMode } from "@/lib/db/client";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const snapshot = await getPaperSnapshot();
  return NextResponse.json({
    ...snapshot,
    storage: getDbMode(),
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
    const action = String(body.action ?? "");

    if (action === "reset") {
      const snapshot = await resetPaperAccount();
      return NextResponse.json({ ok: true, ...snapshot });
    }

    if (action === "toggle") {
      const enabled = Boolean(body.enabled);
      await setPaperEnabled(enabled);
      const snapshot = await getPaperSnapshot();
      return NextResponse.json({ ok: true, ...snapshot });
    }

    return NextResponse.json({ error: "Gecersiz aksiyon." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Gecersiz istek." }, { status: 400 });
  }
}
