/**
 * PING 브랜드 표시 — 이름·색·에셋 경로만.
 * 결제·발송·연락처 로직과 무관하다.
 */
export const PING_BRAND_NAME = "PING";

/** Canonical primary (FUNEX CLOUD). CSS `--ping-primary` 와 동일. */
export const PING_BRAND_PRIMARY = "#0056F3";

/**
 * Approved app logo (P symbol + signal + PING wordmark).
 * Runtime: `public/brand/ping/ping-app-logo-canonical.png`
 * Docs: `docs/references/ping-brand/ping-app-logo-canonical.png`
 */
export const PING_LOGO_CANONICAL_SRC = "/brand/ping/ping-app-logo-canonical.png";

/** Header / profile — full canonical lockup. */
export const PING_LOGO_ON_LIGHT_SRC = PING_LOGO_CANONICAL_SRC;

/** Sending mark / JSON-LD — same canonical file (do not invent a second symbol). */
export const PING_LOGO_MARK_SRC = PING_LOGO_CANONICAL_SRC;

/** Next App Router `src/app/icon.png` → `/icon.png` */
export const PING_APP_ICON_SRC = "/icon.png";

/** Next App Router `src/app/apple-icon.png` → `/apple-icon.png` */
export const PING_APPLE_ICON_SRC = "/apple-icon.png";

export const PING_FAVICON_SRC = "/favicon.ico";
