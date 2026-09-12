import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const FUNEX_SSO_SERVICE = "ping";
export const FUNEX_SSO_CALLBACK_PATH = "/auth/funex/callback";
export const FUNEX_SSO_TX_COOKIE = "ping_funex_sso_tx";
export const FUNEX_SSO_SESSION_COOKIE = "ping_funex_id";

const TX_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function funexAuthBaseUrl(): string {
  return (process.env.FUNEX_AUTH_BASE_URL || "https://auth.funexcloud.com").replace(/\/$/, "");
}

export function sanitizeFunexReturnTo(raw: string | null | undefined): string {
  if (!raw || raw.length > 2048) return "/start";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/start";
  return raw;
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function createFunexState(): string {
  return randomBytes(24).toString("base64url");
}

export type FunexSsoTx = {
  state: string;
  verifier: string;
  returnTo: string;
  exp: number;
};

export function encodeFunexSsoTx(tx: FunexSsoTx, secret: string): string {
  const body = Buffer.from(JSON.stringify(tx)).toString("base64url");
  const sig = createHash("sha256").update(`${body}.${secret}`).digest("base64url");
  return `${body}.${sig}`;
}

export function decodeFunexSsoTx(raw: string | undefined, secret: string): FunexSsoTx | null {
  if (!raw || !secret) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expect = createHash("sha256").update(`${body}.${secret}`).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectBuf = Buffer.from(expect);
  if (sigBuf.length !== expectBuf.length || !timingSafeEqual(sigBuf, expectBuf)) return null;
  try {
    const tx = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as FunexSsoTx;
    if (!tx?.state || !tx.verifier || tx.exp < Date.now()) return null;
    return tx;
  } catch {
    return null;
  }
}

export type FunexSsoSession = {
  userId: string;
  exp: number;
};

export function encodeFunexSsoSession(session: FunexSsoSession, secret: string): string {
  return encodeFunexSsoTx(
    { state: session.userId, verifier: "session", returnTo: "/", exp: session.exp },
    secret,
  );
}

export function decodeFunexSsoSession(raw: string | undefined, secret: string): string | null {
  const tx = decodeFunexSsoTx(raw, secret);
  if (!tx || tx.verifier !== "session") return null;
  return tx.state;
}

export function newFunexSsoTx(returnTo: string): FunexSsoTx {
  const pkce = createPkcePair();
  return {
    state: createFunexState(),
    verifier: pkce.verifier,
    returnTo: sanitizeFunexReturnTo(returnTo),
    exp: Date.now() + TX_TTL_MS,
  };
}

export function funexAuthorizeUrl(tx: FunexSsoTx): string {
  const pkce = createHash("sha256").update(tx.verifier).digest("base64url");
  const url = new URL("/authorize", funexAuthBaseUrl());
  url.searchParams.set("service", FUNEX_SSO_SERVICE);
  url.searchParams.set("returnTo", tx.returnTo);
  url.searchParams.set("state", tx.state);
  url.searchParams.set("code_challenge", pkce);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("callback_url", `https://ping.funexcloud.com${FUNEX_SSO_CALLBACK_PATH}`);
  return url.toString();
}

export function cookieOptions(maxAgeMs: number, path: string) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path,
    maxAge: Math.floor(maxAgeMs / 1000),
  };
}

export { TX_TTL_MS, SESSION_TTL_MS };
