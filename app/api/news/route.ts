import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getSession } from "@/lib/auth";
import { runNewsEngine } from "@/lib/news/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const getCachedNews = unstable_cache(runNewsEngine, ["bist-news"], {
  revalidate: 900, // 15 dakika
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  try {
    const data = await getCachedNews();
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Haber analizi alinamadi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
