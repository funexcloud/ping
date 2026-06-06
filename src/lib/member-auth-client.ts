/**
 * 브라우저 전용 — `assets/js/ping-backend-api-path.js`·`ping-member-login.js` 와 동일한 URL 규칙.
 */
const DEFAULT_NEXT_DEV_PORT = "3002";
const DEFAULT_EXPRESS_PORT = "3000";

function resolveLocalExpressOrigin(): string {
  const port = String(
    process.env.NEXT_PUBLIC_EXPRESS_PORT || DEFAULT_EXPRESS_PORT,
  ).trim();
  return `http://localhost:${port || DEFAULT_EXPRESS_PORT}`;
}

export function resolveMemberAuthApiUrl(path: string): string {
  if (typeof window === "undefined") {
    const p = path.startsWith("/") ? path : `/${path}`;
    return p;
  }
  const p = path.startsWith("/") ? path : `/${path}`;
  const h = window.location.hostname;
  const loopback =
    h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  const port = window.location.port || "";
  const nextDevPort =
    process.env.NEXT_PUBLIC_NEXT_DEV_PORT || DEFAULT_NEXT_DEV_PORT;
  try {
    const pc = (
      window as unknown as {
        __PING_PORTONE_CONFIG__?: {
          pingNextDevPort?: number;
          backendApiOrigin?: string;
        };
      }
    ).__PING_PORTONE_CONFIG__ || {};
    if (
      p.startsWith("/api/auth/") ||
      p.startsWith("/api/guest-auth/") ||
      p.startsWith("/api/admin/app-settings")
    ) {
      return p;
    }
    const bo = String(pc.backendApiOrigin || "")
      .trim()
      .replace(/\/+$/, "");
    if (bo) return bo + p;
  } catch {
    /* noop */
  }
  if (loopback && !p.startsWith("/api/guest-auth/")) {
    return `${resolveLocalExpressOrigin()}${p}`;
  }
  return p;
}

export type ParsedMemberJson = {
  httpOk: boolean;
  data: Record<string, unknown>;
};

const MSG_BAD =
  "서버 응답을 처리할 수 없습니다.";

export async function parseMemberFetchJson(
  r: Response,
): Promise<ParsedMemberJson> {
  const text = await r.text();
  const trimmed = typeof text === "string" ? text.trim() : "";
  let data: Record<string, unknown> = {};
  if (!trimmed) {
    if (!r.ok) {
      return {
        httpOk: r.ok,
        data: {
          ok: false,
          error: `서버에 연결할 수 없거나 응답이 비어 있습니다. (HTTP ${r.status})`,
        },
      };
    }
    return { httpOk: r.ok, data };
  }
  try {
    data = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const head = trimmed.slice(0, 480).toLowerCase();
    let hint = MSG_BAD;
    if (head.startsWith("<!doctype") || head.includes("<html")) {
      hint =
        "회원 API가 같은 주소에 없습니다. `npm run dev`로 로컬 서버를 켜거나, API 서버 URL을 설정한 뒤 `PING_BACKEND_API_ORIGIN`/portone 설정을 불러오는지 확인해 주세요.";
    } else if (!r.ok) {
      hint = `서버 응답을 해석하지 못했습니다. (HTTP ${r.status})`;
    }
    return { httpOk: false, data: { ok: false, error: hint } };
  }
  return { httpOk: r.ok, data };
}
