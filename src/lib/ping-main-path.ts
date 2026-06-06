/**
 * ping.funexcloud.com — 대량 발송 React step-zero(App Router).
 * 예전 `/bulk` 는 `next.config` redirect 로 `/start` 로 통일.
 */
export const PING_MAIN_APP_PATH = "/start";

/**
 * 통합 운영 콘솔 — 마케팅 「도입하기」 CTA (외부 URL).
 * `NEXT_PUBLIC_PING_CONSOLE_URL` 로 환경별 오버라이드.
 */
/** 로그인 후 PING 운영 대시보드 (`/ping` 은 콘솔에서 `/services` 로 307) */
export const PING_CONSOLE_APP_URL = (
  process.env.NEXT_PUBLIC_PING_CONSOLE_URL ||
  "https://console.funexcloud.com/login?next=/dashboard/ping"
).replace(/\/$/, "");
