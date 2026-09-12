import { NextResponse } from "next/server";

import {
  FUNEX_SSO_CALLBACK_PATH,
  FUNEX_SSO_SERVICE,
  FUNEX_SSO_SESSION_COOKIE,
  FUNEX_SSO_TX_COOKIE,
  SESSION_TTL_MS,
  cookieOptions,
  decodeFunexSsoTx,
  encodeFunexSsoSession,
  funexAuthBaseUrl,
  sanitizeFunexReturnTo,
} from "@/lib/funex-sso";

export const dynamic = "force-dynamic";

function ssoSecret(): string {
  return String(process.env.FUNEX_PING_CLIENT_SECRET || process.env.PING_OAUTH_STATE_SECRET || "").trim();
}

export async function GET(request: Request) {
  const secret = ssoSecret();
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const fail = NextResponse.redirect(new URL("/login?error=funex_sso", url.origin));

  if (!secret || code.length < 32 || !state) return fail;

  const cookieHeader = request.headers.get("cookie") || "";
  const rawTx = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${FUNEX_SSO_TX_COOKIE}=`))
    ?.slice(FUNEX_SSO_TX_COOKIE.length + 1);
  const tx = decodeFunexSsoTx(rawTx ? decodeURIComponent(rawTx) : undefined, secret);
  if (!tx || tx.state !== state) return fail;

  const clientSecret = String(process.env.FUNEX_PING_CLIENT_SECRET || "").trim();
  if (!clientSecret) return fail;

  const basic = Buffer.from(`${FUNEX_SSO_SERVICE}:${clientSecret}`).toString("base64");
  const exchange = await fetch(`${funexAuthBaseUrl()}/api/funex-auth/grants/exchange`, {
    method: "POST",
    headers: {
      authorization: `Basic ${basic}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      code,
      code_verifier: tx.verifier,
      callback_url: `https://ping.funexcloud.com${FUNEX_SSO_CALLBACK_PATH}`,
    }),
    cache: "no-store",
  }).catch(() => null);

  if (!exchange?.ok) return fail;
  const identity = (await exchange.json().catch(() => null)) as { userId?: string; subject?: string } | null;
  const userId = identity?.userId || identity?.subject;
  if (!userId) return fail;

  const dest = sanitizeFunexReturnTo(tx.returnTo);
  const response = NextResponse.redirect(new URL(dest, url.origin));
  response.cookies.set(FUNEX_SSO_TX_COOKIE, "", { ...cookieOptions(0, "/"), maxAge: 0 });
  response.cookies.set(
    FUNEX_SSO_SESSION_COOKIE,
    encodeFunexSsoSession({ userId, exp: Date.now() + SESSION_TTL_MS }, secret),
    cookieOptions(SESSION_TTL_MS, "/"),
  );
  return response;
}
