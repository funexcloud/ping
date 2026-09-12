import { NextResponse } from "next/server";

import { FUNEX_SSO_SESSION_COOKIE, cookieOptions } from "@/lib/funex-sso";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ ok: true, scope: "local" });
  response.cookies.set(FUNEX_SSO_SESSION_COOKIE, "", {
    ...cookieOptions(0, "/"),
    maxAge: 0,
  });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dest = url.searchParams.get("returnTo")?.startsWith("/")
    ? url.searchParams.get("returnTo")!
    : "/login";
  const response = NextResponse.redirect(new URL(dest, url.origin));
  response.cookies.set(FUNEX_SSO_SESSION_COOKIE, "", {
    ...cookieOptions(0, "/"),
    maxAge: 0,
  });
  return response;
}
