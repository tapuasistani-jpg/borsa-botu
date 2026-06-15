export function isCronSecretConfigured(): boolean {
  return Boolean(process.env.CRON_SECRET?.trim());
}

/**
 * cron-job.org uyumlu dogrulama:
 * - Authorization: Bearer <CRON_SECRET>
 * - x-cron-secret: <CRON_SECRET>
 * - ?secret=<CRON_SECRET> (URL parametresi — header zor ise)
 */
export function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const authHeader = request.headers.get("authorization")?.trim();
  if (authHeader) {
    const bearer = authHeader.match(/^Bearer\s+(.+)$/i);
    if (bearer && bearer[1].trim() === secret) return true;
    if (authHeader === secret) return true;
  }

  const cronHeader = request.headers.get("x-cron-secret")?.trim();
  if (cronHeader === secret) return true;

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret")?.trim();
  if (querySecret === secret) return true;

  return false;
}

export function cronAuthHint(): string {
  return "Header: Authorization Bearer CRON_SECRET — veya URL: ?secret=CRON_SECRET — Production URL kullan (preview degil).";
}
