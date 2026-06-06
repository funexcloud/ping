import { NextRequest, NextResponse } from "next/server";

/**
 * 3단계: Vercel Edge 안티봇 쉴드 — `/s/*`(안심 부고 링크)에만 적용.
 *
 * 부고장이 뜨기 전, 서버에 도달하기도 전(Edge)에서 접속 환경을 검사한다.
 * - 알려진 스크래핑/취약점 스캐너 봇과 빈 UA 는 차단(원천 봇 차단).
 * - 카카오톡·문자 등 메신저 미리보기 크롤러는 막지 않는다(부고 미리보기 유지).
 * - 클릭재킹·레퍼러 유출 방지 보안 헤더 부여.
 *
 * 실제 0.5초 "보안 구성 중" 트랜지션은 `/s/[token]` 페이지(클라이언트)에서 연출한다.
 * Edge 는 빠르게 통과시켜 실사용자 지연을 만들지 않는다.
 */
export const config = {
  matcher: ["/s/:path*"],
};

const BLOCKED_UA =
  /(curl\/|wget\/|python-requests|python-urllib|libwww-perl|java\/|okhttp|go-http-client|scrapy|masscan|nmap|zgrab|nikto|sqlmap|semrushbot|ahrefsbot|dotbot|mj12bot|petalbot|dataforseo|httrack|wpscan)/i;

export function middleware(req: NextRequest) {
  const ua = req.headers.get("user-agent") || "";

  if (!ua.trim() || BLOCKED_UA.test(ua)) {
    return new NextResponse("Forbidden", {
      status: 403,
      headers: {
        "cache-control": "no-store",
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }

  const res = NextResponse.next();
  res.headers.set("x-ping-safe-shield", "1");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("cache-control", "no-store");
  return res;
}
