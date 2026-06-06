/** `public/index.html` 의 indexUtf8ByteLength / INDEX_BULK_SMS_TEMPLATES / indexSanitizeBulkSmsBodyText 와 동일 */

export const BULK_SMS_BODY_MAX_BYTES = 2000;
export const BULK_SMS_TITLE_MAX_CHARS = 40;

export const BULK_COMPOSE_HELP =
  "본문은 UTF-8 기준 2,000바이트까지 입력할 수 있습니다.\n" +
  "{{LINK}} 를 넣으면 발송 시 부고 주소로 바뀝니다.\n" +
  "#{이름} 은 발송 시 수신자 이름으로 바뀝니다.";

/** `index.html` `indexGetThankYouSmsTemplateDefault` 와 동일 */
export const BULK_THANKYOU_SMS_DEFAULT =
  "#{이름}님께\n\n깊은 위로의 마음에 감사드립니다.\n삼가 고인의 명복을 빕니다.\n\n○○○ 가족 올림";

export const BULK_THANKYOU_COMPOSE_HELP =
  "본문은 UTF-8 기준 2,000바이트까지 입력할 수 있습니다.\n" +
  "#{이름} 을 넣으면 발송 시 수신자 이름으로 바뀝니다.";

export function bulkSmsUtf8ByteLength(str: string): number {
  return new TextEncoder().encode(str).length;
}

export function truncateBulkSmsBodyToMaxBytes(s: string, maxBytes = BULK_SMS_BODY_MAX_BYTES): string {
  if (bulkSmsUtf8ByteLength(s) <= maxBytes) return s;
  let end = s.length;
  while (end > 0 && bulkSmsUtf8ByteLength(s.slice(0, end)) > maxBytes) end -= 1;
  return s.slice(0, end);
}

export function sanitizeBulkSmsBodyText(s: string): string {
  let t = String(s || "");
  t = t.replace(/삼가\s*고인의\s*명복을\s*빕니다\.?/g, "삼가 명복을 빕니다.");
  t = t.replace(/(^|\r?\n)(\s*)고인\s+/gm, "$1$2");
  return t;
}

export type BulkSmsTemplateId = "1" | "2";

/** `INDEX_BULK_SMS_TEMPLATES` — 스냅샷은 레거시가 부고 파싱 시 채움. React 단계에서는 고정 문자열만 사용. */
export const INDEX_BULK_SMS_TEMPLATES: Record<BulkSmsTemplateId, string> = {
  "1":
    "故 (성명)님 (남/세)\n\n자 (성명), (성명)\n자부 (성명) ,(성명)\n녀 (성명)\n사위 (성명)\n손 (성명)\n발인 (미상)\n장례식장 (식장명) , (호실)\n1차 장지 (장지명)\n2차 장지 (장지명)\n\n부고: {{LINK}}",
  "2":
    "故 (성명)님과 함께했던 소중한 인연들을 기억하며 마지막 인사를 전합니다.\n\n■ 故 (성명)님 (향년 · 세)\n\n■ 유가족\n아들: (성명), (성명)\n딸: (성명)\n며느리: (성명), (성명)\n사위: (성명)\n\n■ 마지막 가시는 길\n발인: (미상)\n빈소: (식장명) (호실)호\n장지: (1차 장지) ➔ (2차 없으면 ➔부터 삭제)\n\n■ 마음 전하실 곳\n{{LINK}}",
};

export function getStaticBulkTemplateBody(id: BulkSmsTemplateId): string {
  return sanitizeBulkSmsBodyText(INDEX_BULK_SMS_TEMPLATES[id]);
}

export function isBulkSmsBodyStepValid(body: string): boolean {
  const t = String(body || "").trim();
  if (!t) return false;
  return bulkSmsUtf8ByteLength(t) <= BULK_SMS_BODY_MAX_BYTES;
}

/** `index.html` `indexResolveBulkSmsOrderBody` — Firestore 주문 본문 */
export function resolveBulkSmsOrderBody(opts: {
  draft: string;
  templateId: BulkSmsTemplateId;
  obituaryPageUrl: string;
  isThankYou: boolean;
}): string {
  let raw = String(opts.draft || "").trim();
  const link = String(opts.obituaryPageUrl || "").trim();
  const tid = opts.templateId === "2" ? "2" : "1";
  if (opts.isThankYou) {
    if (!raw.length) raw = BULK_THANKYOU_SMS_DEFAULT;
    return sanitizeBulkSmsBodyText(raw);
  }
  if (!raw.length) {
    raw = getStaticBulkTemplateBody(tid);
  }
  raw = sanitizeBulkSmsBodyText(raw);
  let out = raw.includes("{{LINK}}") ? raw.replace(/\{\{LINK\}\}/g, link || "") : raw;
  if (link && !out.includes(link) && !raw.includes("{{LINK}}")) {
    out = out + (out ? "\n\n" : "") + link;
  }
  return out;
}
