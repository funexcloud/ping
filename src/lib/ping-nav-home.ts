/**
 * 전체 문서 이동(클라이언트 라우터 밖). 일반 진입은 `/` → `/intro` → `/start`.
 */
export function pingAssignToLocation(pathWithQuery: string): void {
  if (typeof window === "undefined") return;
  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  window.location.assign(path);
}
