/** 브라우저 API 베이스 — 레거시 `getApiBaseUrl()` 과 동일 */
export function pingApiBase(): string {
  if (typeof window === "undefined") return "/api";
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1" || h === "[::1]") {
    return "http://127.0.0.1:3000/api";
  }
  return "/api";
}
