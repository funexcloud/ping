/**
 * PING 안심 부고 링크 — 동적 서명 토큰 (1·2단계)
 *
 * 외부 부고 URL(우리부고·모두부고 등)을 그대로 노출하는 대신,
 * `ping.../s/{token}` 형태의 **서명된** 토큰으로 감싼다.
 *
 * - 1단계: 서버 시크릿(`PING_SAFE_LINK_SECRET`)으로 HS256 서명 → URL 위·변조 차단.
 * - 2단계: 발인 일시를 만료(`exp`)로 설정 → 발인 후 자동 소멸(정적 추모 페이지 전환).
 *
 * `jose`는 Node·Edge(미들웨어) 양쪽에서 동작하므로 이 모듈은 서버·엣지 공용이다.
 * 클라이언트 번들에 import 하지 말 것(시크릿 접근).
 */
import { SignJWT, jwtVerify, decodeJwt, errors as joseErrors } from "jose";

export const SAFE_LINK_PATH_PREFIX = "/s";
export const SAFE_LINK_ISSUER = "ping";

/** 발인 일시를 알 수 없을 때 기본 만료(일). */
export const SAFE_LINK_DEFAULT_TTL_SECONDS = 14 * 24 * 60 * 60;
/** 발인 직후 조문·계좌 확인 흐름이 끊기지 않도록 두는 유예 시간(발인 +48h). */
export const SAFE_LINK_GRACE_SECONDS = 48 * 60 * 60;
/** 개발/로컬에서만 쓰는 폴백 시크릿. 운영에서는 반드시 env 로 덮어쓴다. */
const DEV_FALLBACK_SECRET = "ping-dev-safe-link-secret-change-me";

export type SafeLinkClaims = {
  /** 목적지(외부 부고 https URL) */
  u: string;
  /** 고인명(만료 시 정적 추모 페이지 표기용, 선택) */
  dn?: string;
  /** 주문 식별자(선택) */
  oid?: string;
  /** 발송자 식별자(선택, 해시 권장) */
  snd?: string;
};

export type SafeLinkVerifyResult =
  | { ok: true; claims: SafeLinkClaims; expiresAt: number }
  | { ok: false; expired: true; claims: SafeLinkClaims | null; reason: string }
  | { ok: false; expired: false; claims: null; reason: string };

function getSecretKey(): Uint8Array {
  const raw = (
    process.env.PING_SAFE_LINK_SECRET ||
    process.env.PING_SAFE_LINK_SIGNING_KEY ||
    ""
  ).trim();
  const secret =
    raw || (process.env.NODE_ENV === "production" ? "" : DEV_FALLBACK_SECRET);
  if (!secret) {
    throw new Error(
      "PING_SAFE_LINK_SECRET 환경변수가 필요합니다(안심 부고 링크 서명용).",
    );
  }
  return new TextEncoder().encode(secret);
}

export function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim() || /\s/.test(value.trim())) {
    return false;
  }
  try {
    return new URL(value.trim()).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * "2024-01-01 07:30", "2024.1.1 7시", "2024년 1월 1일 오전 7시" 등 한국식 일시 → UTC epoch(ms).
 * 시간대 표기가 없으면 KST(UTC+9)로 간주한다. 파싱 불가/미정이면 null.
 */
export function parseKoreanDateTimeToEpochMs(
  raw: string | null | undefined,
): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s || /미정|미상|추후|없음/.test(s)) return null;

  const dm = s.match(/(\d{4})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/);
  if (!dm) return null;

  const year = Number(dm[1]);
  const month = Number(dm[2]);
  const day = Number(dm[3]);
  if (!year || !month || !day) return null;

  // 날짜 뒤 남은 문자열에서 시:분 추출("(화) 07:00", "오전 7시" 등도 처리).
  const rest = s.slice((dm.index ?? 0) + dm[0].length);
  let hour = 9; // 시간 미표기 시 발인 통상 시간대(09:00)
  let minute = 0;
  const tm = rest.match(/(\d{1,2})\s*[:시]\s*(\d{1,2})?/);
  if (tm) {
    hour = Number(tm[1]);
    minute = tm[2] != null ? Number(tm[2]) : 0;
    if (/오후|pm/i.test(rest) && hour < 12) hour += 12;
    if (/오전|am/i.test(rest) && hour === 12) hour = 0;
    if (hour > 23 || minute > 59) {
      hour = 9;
      minute = 0;
    }
  }

  // KST(UTC+9) 기준 입력 → UTC epoch
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, 0) - 9 * 60 * 60 * 1000;
  return Number.isNaN(utcMs) ? null : utcMs;
}

/**
 * 발인 일시 → 토큰 만료(epoch seconds).
 * - 발인 + 유예시간.
 * - 발인이 이미 지났거나 미정이면 최소 미래 시점(now + 유예/기본 TTL)을 보장한다.
 */
export function resolveSafeLinkExpiryEpochSeconds(
  departureRaw: string | null | undefined,
  opts?: { graceSeconds?: number; nowMs?: number },
): number {
  const nowMs = opts?.nowMs ?? Date.now();
  const grace = opts?.graceSeconds ?? SAFE_LINK_GRACE_SECONDS;
  const depMs = parseKoreanDateTimeToEpochMs(departureRaw);
  const minExp = Math.floor(nowMs / 1000) + grace;
  if (depMs != null) {
    return Math.max(Math.floor(depMs / 1000) + grace, minExp);
  }
  return Math.floor(nowMs / 1000) + SAFE_LINK_DEFAULT_TTL_SECONDS;
}

export async function signSafeLinkToken(
  claims: SafeLinkClaims,
  opts: { expEpochSeconds: number; iatMs?: number },
): Promise<string> {
  if (!isHttpsUrl(claims.u)) {
    throw new Error("안심 링크 목적지는 https URL 이어야 합니다.");
  }
  const iat = Math.floor((opts.iatMs ?? Date.now()) / 1000);
  const payload: SafeLinkClaims = { u: claims.u.trim() };
  if (claims.dn) payload.dn = String(claims.dn).slice(0, 40);
  if (claims.oid) payload.oid = String(claims.oid).slice(0, 64);
  if (claims.snd) payload.snd = String(claims.snd).slice(0, 64);

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(SAFE_LINK_ISSUER)
    .setIssuedAt(iat)
    .setExpirationTime(opts.expEpochSeconds)
    .sign(getSecretKey());
}

function toClaims(payload: Record<string, unknown> | null): SafeLinkClaims | null {
  if (!payload || typeof payload.u !== "string") return null;
  const claims: SafeLinkClaims = { u: payload.u };
  if (typeof payload.dn === "string") claims.dn = payload.dn;
  if (typeof payload.oid === "string") claims.oid = payload.oid;
  if (typeof payload.snd === "string") claims.snd = payload.snd;
  return claims;
}

export async function verifySafeLinkToken(
  token: string | null | undefined,
): Promise<SafeLinkVerifyResult> {
  if (!token || typeof token !== "string") {
    return { ok: false, expired: false, claims: null, reason: "토큰이 없습니다." };
  }
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: SAFE_LINK_ISSUER,
    });
    const claims = toClaims(payload as Record<string, unknown>);
    if (!claims || !isHttpsUrl(claims.u)) {
      return {
        ok: false,
        expired: false,
        claims: null,
        reason: "토큰 페이로드가 올바르지 않습니다.",
      };
    }
    return { ok: true, claims, expiresAt: Number(payload.exp) * 1000 };
  } catch (e) {
    // jose 는 서명 검증 → 클레임(exp) 순으로 처리하므로, JWTExpired = 서명은 유효.
    // 따라서 만료 토큰의 고인명은 추모 페이지 표기용으로 안전하게 디코드할 수 있다.
    if (e instanceof joseErrors.JWTExpired) {
      let claims: SafeLinkClaims | null = null;
      try {
        claims = toClaims(decodeJwt(token) as Record<string, unknown>);
      } catch {
        claims = null;
      }
      return { ok: false, expired: true, claims, reason: "링크가 만료되었습니다." };
    }
    return {
      ok: false,
      expired: false,
      claims: null,
      reason: "토큰 검증에 실패했습니다.",
    };
  }
}

export function buildSafeLinkUrl(origin: string, token: string): string {
  const base = String(origin || "").replace(/\/+$/, "");
  return `${base}${SAFE_LINK_PATH_PREFIX}/${token}`;
}
