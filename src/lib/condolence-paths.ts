import { guestbookSmsText } from "@/lib/contacts/guestbook-sms";

/** 디지털 방명록 마케팅 랜딩 */
export const CONDOLENCE_LANDING_PATH = "/condolence";

/** 로그인 후 방명록 앱 */
export const CONDOLENCE_BOOK_PATH = "/condolence/book";

/** 영구 이용권 결제 */
export const CONDOLENCE_LICENSE_PATH = "/condolence/book/license";

export const CONDOLENCE_CASE_ID_RE = /^[A-Za-z0-9_-]{8,80}$/;
export const CONDOLENCE_JOIN_CODE_RE = /^[A-F0-9]{10}$/;

export function isCondolenceCaseId(value: string): boolean {
  return CONDOLENCE_CASE_ID_RE.test(value);
}

export function normalizeCondolenceJoinCode(value: string | null | undefined): string {
  return String(value || "").trim().toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 10);
}

export function isCondolenceJoinCode(value: string | null | undefined): boolean {
  return CONDOLENCE_JOIN_CODE_RE.test(normalizeCondolenceJoinCode(value));
}

export function condolenceJoinCodeFromSearch(search: string | URLSearchParams): string {
  const params = typeof search === "string"
    ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
    : search;
  const code = normalizeCondolenceJoinCode(params.get("join"));
  return isCondolenceJoinCode(code) ? code : "";
}

/** 붙여넣은 초대 링크 또는 10자리 코드에서 참여 코드를 뽑는다. */
export function extractCondolenceJoinCode(raw: string | null | undefined): string {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  if (/join=/i.test(trimmed) || /^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed, "https://ping.local");
      const fromQuery = condolenceJoinCodeFromSearch(url.search);
      if (fromQuery) return fromQuery;
    } catch {
      /* not a URL */
    }
  }
  const code = normalizeCondolenceJoinCode(trimmed);
  return isCondolenceJoinCode(code) ? code : "";
}

export function condolenceJoinHref(joinCode: string): string {
  const code = normalizeCondolenceJoinCode(joinCode);
  if (!isCondolenceJoinCode(code)) return CONDOLENCE_BOOK_PATH;
  return `${CONDOLENCE_BOOK_PATH}?join=${encodeURIComponent(code)}`;
}

export function condolenceGuestbookHref(caseId: string, extra?: { source?: string }): string {
  if (!isCondolenceCaseId(caseId)) return CONDOLENCE_BOOK_PATH;
  const path = `/guestbook/${encodeURIComponent(caseId)}`;
  const source = String(extra?.source || "").trim();
  if (!source) return path;
  return `${path}?source=${encodeURIComponent(source)}`;
}

export function condolenceGuestbookSmsText(deceasedName: string, pageUrl: string): string {
  return guestbookSmsText(deceasedName, pageUrl);
}

export function condolenceLicenseHref(caseId: string): string {
  return `${CONDOLENCE_LICENSE_PATH}?case=${encodeURIComponent(caseId)}`;
}

export function condolenceBookHref(caseId?: string, extra?: { exportCsv?: boolean }): string {
  if (!caseId || !isCondolenceCaseId(caseId)) return CONDOLENCE_BOOK_PATH;
  const q = new URLSearchParams();
  q.set("case", caseId);
  if (extra?.exportCsv) q.set("export", "csv");
  return `${CONDOLENCE_BOOK_PATH}?${q.toString()}`;
}

/** 로그인 `next` — 방명록·이용권만 허용 (오픈 리다이렉트 방지) */
export function condolenceSafeNextPath(raw: string | null | undefined): string {
  const v = String(raw || "").trim();
  if (!v.startsWith("/")) return CONDOLENCE_BOOK_PATH;
  let url: URL;
  try {
    url = new URL(v, "https://ping.local");
  } catch {
    return CONDOLENCE_BOOK_PATH;
  }
  if (url.pathname === CONDOLENCE_LICENSE_PATH) {
    const caseId = url.searchParams.get("case") || "";
    return isCondolenceCaseId(caseId) ? condolenceLicenseHref(caseId) : CONDOLENCE_BOOK_PATH;
  }
  if (url.pathname === CONDOLENCE_BOOK_PATH || url.pathname === CONDOLENCE_LANDING_PATH) {
    const joinCode = condolenceJoinCodeFromSearch(url.search);
    if (joinCode) return condolenceJoinHref(joinCode);
    const caseId = url.searchParams.get("case") || "";
    const exportCsv = url.searchParams.get("export") === "csv";
    if (isCondolenceCaseId(caseId)) return condolenceBookHref(caseId, { exportCsv });
    return CONDOLENCE_BOOK_PATH;
  }
  return CONDOLENCE_BOOK_PATH;
}
