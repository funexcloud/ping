/** `public/index.html` 의 indexExtractFirstHttpsUrl / indexNormalizeExternalObituaryUrl / indexIsValidExternalObituaryUrl 와 동일 규칙 */

export function extractFirstHttpsUrl(raw: string | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  const m = String(raw).match(/https:\/\/[^\s<>"')\]}]+/i);
  if (!m) return null;
  return m[0].replace(/[.,;]+$/g, "");
}

export function normalizeExternalObituaryUrl(raw: string | null | undefined): string {
  const extracted = extractFirstHttpsUrl(raw ?? "");
  if (extracted) return extracted;
  return String(raw == null ? "" : raw)
    .replace(/\s/g, "")
    .trim();
}

export function isValidExternalObituaryUrl(s: string): boolean {
  if (!s || /\s/.test(s)) return false;
  try {
    const u = new URL(s);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

export const EXTERNAL_OBITUARY_URL_HINT =
  "https:// 로 시작하는 부고 페이지 주소만 사용할 수 있습니다. 긴 문자를 붙여넣어도 그 안의 https 링크만 남습니다.";
