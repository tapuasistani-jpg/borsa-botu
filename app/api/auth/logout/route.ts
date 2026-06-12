import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";
import { sessionCookieOptions } from "@/lib/env";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "", sessionCookieOptions(0));
  return response;
}
