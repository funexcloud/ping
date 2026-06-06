/**
 * 로컬: Express 기본 http://localhost:3000 (PING_EXPRESS_PORT)
 * `127.0.0.1` 은 동일 포트에 다른 dev 서버(Vite 등)가 붙어 있으면 잘못된 프로세스로 갈 수 있음.
 * 배포 Next: .env 의 PING_BACKEND_API_ORIGIN 또는 PING_EXPRESS_ORIGIN 필수
 */
export function getPingExpressBackendOrigin(): string {
  const a = String(process.env.PING_EXPRESS_ORIGIN || "")
    .trim()
    .replace(/\/+$/, "");
  if (a) return a;
  const b = String(process.env.PING_BACKEND_API_ORIGIN || "")
    .trim()
    .replace(/\/+$/, "");
  if (b) return b;
  const port = String(process.env.PING_EXPRESS_PORT || "3000").trim();
  return `http://localhost:${port}`;
}

/**
 * 회원 JSON 저장소(JSON members.local.json)가 있는 Express만.
 * `PING_BACKEND_API_ORIGIN`(결제·스크래핑 원격 API)과 분리 — 로그인이 잘못된 서버로 가는 문제 방지.
 */
export function getPingExpressMemberAuthOrigin(): string {
  const a = String(process.env.PING_EXPRESS_ORIGIN || "")
    .trim()
    .replace(/\/+$/, "");
  if (a) return a;
  const port = String(process.env.PING_EXPRESS_PORT || "3000").trim();
  return `http://localhost:${port}`;
}

/** Next에서 GCS/디스크 회원 JSON을 쓸 수 있을 때만 Vercel에서 인증 API를 직접 처리 */
export function canPersistMemberStoreOnNext(): boolean {
  return Boolean(
    String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim() ||
      String(process.env.GOOGLE_APPLICATION_CREDENTIALS || "").trim(),
  );
}

function isMemberAuthApiTail(apiTail: string): boolean {
  return (
    apiTail.startsWith("auth/") ||
    apiTail.startsWith("guest-auth/") ||
    apiTail.startsWith("admin/app-settings")
  );
}

/**
 * Vercel에 `FIREBASE_SERVICE_ACCOUNT_JSON` 이 없으면 Cloud Run Express(회원 GCS)로 프록시.
 * 있으면 Next `/api/auth` 등에서 직접 처리.
 */
export function shouldUseExpressMemberHost(apiTail: string): boolean {
  if (!isMemberAuthApiTail(apiTail)) return false;
  return !canPersistMemberStoreOnNext();
}
