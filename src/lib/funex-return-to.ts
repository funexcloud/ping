/** JIT 연락처 단계 복귀. 부고 본문은 sessionStorage에 두고 쿼리만 왕복한다. */
export const FUNEX_JIT_CONTACTS_RETURN = "/start?skipIntro=1&resumeContacts=1";

export function sanitizeFunexReturnTo(raw: string | null | undefined, fallback = "/start"): string {
  if (!raw || raw.length > 2048) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  return raw;
}
