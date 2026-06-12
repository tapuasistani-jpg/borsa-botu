import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  createSessionToken,
  SESSION_HOURS,
  validateCredentials,
} from "@/lib/auth";
import { sessionCookieOptions } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "Kullanici adi ve sifre gerekli." },
        { status: 400 }
      );
    }

    if (!validateCredentials(username, password)) {
      return NextResponse.json(
        { error: "Kullanici adi veya sifre hatali." },
        { status: 401 }
      );
    }

    const token = await createSessionToken(username);
    const response = NextResponse.json({ ok: true, username });

    response.cookies.set(
      COOKIE_NAME,
      token,
      sessionCookieOptions(SESSION_HOURS * 60 * 60)
    );

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Giris sirasinda hata olustu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
