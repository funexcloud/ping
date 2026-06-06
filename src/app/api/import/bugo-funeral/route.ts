import path from "node:path";
import { pathToFileURL } from "node:url";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BugoImportModule = {
  PROVIDER_ID: string;
  importFuneralPageFromUrl: (url: string) => Promise<{
    provider?: string;
    url: string;
    parsed?: unknown;
    messageBody?: string;
    messageBodyTemplate2?: string;
  }>;
};

let cached: BugoImportModule | null = null;

async function loadBugoImport(): Promise<BugoImportModule> {
  if (cached) return cached;
  const modPath = path.join(process.cwd(), "src/lib/ping-bugo-import-server.cjs");
  const mod = (await import(/* webpackIgnore: true */ pathToFileURL(modPath).href)) as {
    default?: BugoImportModule;
  } & BugoImportModule;
  cached = (mod.default || mod) as BugoImportModule;
  return cached;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
    const url = body && typeof body.url === "string" ? body.url.trim() : "";
    if (!url) {
      return NextResponse.json({ ok: false, error: "url이 필요합니다." }, { status: 400 });
    }

    const bugoImport = await loadBugoImport();
    const result = await bugoImport.importFuneralPageFromUrl(url);

    return NextResponse.json({
      ok: true,
      provider: result.provider || bugoImport.PROVIDER_ID,
      url: result.url,
      parsed: result.parsed,
      messageBody: result.messageBody,
      messageBodyTemplate2: result.messageBodyTemplate2,
    });
  } catch (e) {
    const message =
      e instanceof Error && e.message
        ? e.message
        : "부고 정보를 가져오지 못했습니다.";
    console.warn("bugo-funeral import:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
