/** 마케팅 헤더 로그인 — 기본 복귀는 마이페이지 */
export function memberLoginMarketingHref(next?: string | null): string {
  const q = new URLSearchParams();
  q.set("from", "marketing");
  q.set("method", "email");
  q.set("next", next?.trim() || "/mypage");
  return `/member-login?${q.toString()}`;
}
