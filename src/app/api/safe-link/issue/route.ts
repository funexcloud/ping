import { NextRequest, NextResponse } from "next/server";
import {
  buildSafeLinkUrl,
  isHttpsUrl,
  resolveSafeLinkExpiryEpochSeconds,
  signSafeLinkToken,
} from "@/lib/ping-safe-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 안심 부고 링크 발급 — 외부 부고 URL 을 받아 서명 토큰 `/s/{token}` 으로 감싼다.
 * 시크릿은 서버에만 있으므로 클라이언트가 링크를 위조할 수 없다.
 */
function resolveOrigin(request: NextRequest): string {
  // 운영 캐논 도메인이 지정돼 있으면 그쪽을 우선(문자에 들어가는 절대 URL 안정화).
  const configured = (
    process.env.PING_SAFE_LINK_ORIGIN ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    ""
  )
    .trim()
    .replace(/\/+$/, "");
  if (configured && process.env.NODE_ENV === "production") return configured;

  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    "";
  if (host) return `${proto}://${host}`;
  return configured || "https://ping.funexcloud.com";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      url?: unknown;
      deceasedName?: unknown;
      departureAt?: unknown;
      orderId?: unknown;
    } | null;

    const url = body && typeof body.url === "string" ? body.url.trim() : "";
    if (!isHttpsUrl(url)) {
      return NextResponse.json(
        { ok: false, error: "https:// 로 시작하는 부고 URL 이 필요합니다." },
        { status: 400 },
      );
    }

    const deceasedName =
      body && typeof body.deceasedName === "string" ? body.deceasedName.trim() : "";
    const departureAt =
      body && typeof body.departureAt === "string" ? body.departureAt.trim() : "";
    const orderId =
      body && typeof body.orderId === "string" ? body.orderId.trim() : "";

    const expEpochSeconds = resolveSafeLinkExpiryEpochSeconds(departureAt);
    const token = await signSafeLinkToken(
      {
        u: url,
        dn: deceasedName || undefined,
        oid: orderId || undefined,
      },
      { expEpochSeconds },
    );

    const safeUrl = buildSafeLinkUrl(resolveOrigin(request), token);

    return NextResponse.json({
      ok: true,
      token,
      safeUrl,
      expiresAt: expEpochSeconds * 1000,
    });
  } catch (e) {
    const message =
      e instanceof Error && e.message ? e.message : "안심 링크 발급에 실패했습니다.";
    console.warn("safe-link issue:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
