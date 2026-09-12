import { NextResponse } from "next/server";

import {
  FUNEX_SSO_TX_COOKIE,
  TX_TTL_MS,
  cookieOptions,
  encodeFunexSsoTx,
  funexAuthorizeUrl,
  newFunexSsoTx,
  sanitizeFunexReturnTo,
} from "@/lib/funex-sso";

export const dynamic = "force-dynamic";

function ssoSecret(): string {
  return String(process.env.FUNEX_PING_CLIENT_SECRET || process.env.PING_OAUTH_STATE_SECRET || "").trim();
}

export async function GET(request: Request) {
  const secret = ssoSecret();
  if (!secret) {
    return NextResponse.json({ error: "funex_sso_unconfigured" }, { status: 503 });
  }
  const url = new URL(request.url);
  const dest = sanitizeFunexReturnTo(url.searchParams.get("returnTo") || url.searchParams.get("next"));
  const tx = newFunexSsoTx(dest);
  const authorize = funexAuthorizeUrl(tx);
  const response = NextResponse.redirect(authorize);
  response.cookies.set(FUNEX_SSO_TX_COOKIE, encodeFunexSsoTx(tx, secret), cookieOptions(TX_TTL_MS, "/"));
  return response;
}
