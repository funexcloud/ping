import { LEGAL_DOCUMENTS } from "@/content/legal";

/** 임베드 본문에서 구 요약 안내(요약본입니다…) 제거 — SSR·클라이언트 공통 */
export function sanitizeLegalArticleHtml(html: string): string {
  let out = html;
  out = out.replace(
    /<[^>]*\bclass="[^"]*\bping-law-note\b[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi,
    "",
  );
  out = out.replace(/<p[^>]*>[\s\S]*?<\/p>/gi, (block) => {
    const t = block.replace(/<[^>]+>/g, "").trim();
    if (t.startsWith("요약본입니다") || t.includes("요약본입니다. 전문은")) {
      return "";
    }
    return block;
  });
  return out;
}

export const SIGNUP_EMBED_TERMS_HTML = sanitizeLegalArticleHtml(
  LEGAL_DOCUMENTS["terms-of-service"].articleHtml,
);

export const SIGNUP_EMBED_PRIVACY_HTML = sanitizeLegalArticleHtml(
  LEGAL_DOCUMENTS["privacy-policy"].articleHtml,
);
