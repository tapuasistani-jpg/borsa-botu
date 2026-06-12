import { timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getAuthEnv } from "./env";
import { COOKIE_NAME, SESSION_HOURS } from "./session";

function getSecretKey(): Uint8Array {
  const { JWT_SECRET } = getAuthEnv();
  return new TextEncoder().encode(JWT_SECRET);
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function validateCredentials(username: string, password: string): boolean {
  const { AUTH_USERNAME, AUTH_PASSWORD } = getAuthEnv();
  return safeEqual(username, AUTH_USERNAME) && safeEqual(password, AUTH_PASSWORD);
}

export async function createSessionToken(username: string): Promise<string> {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getSecretKey());
  return payload as { username: string };
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export { COOKIE_NAME, SESSION_HOURS } from "./session";
