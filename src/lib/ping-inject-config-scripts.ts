import { ensurePingLocalEnv } from "@/lib/ensure-ping-local-env";

function pingEnvTruthy(name: string): boolean {
  const v = String(process.env[name] ?? "").trim();
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes";
}

/** server.js 와 동일 — 가이드 공개 샘플 키 */
const TOSS_PAYMENTS_DOCS_WIDGET_CLIENT_KEY =
  "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";

export function getGoogleOAuthConfigJs(): string {
  ensurePingLocalEnv();
  const clientId =
    process.env.GOOGLE_OAUTH_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    "";
  const apiKey = process.env.GOOGLE_API_KEY || "";
  return `window.__PING_GOOGLE_CONFIG__=${JSON.stringify({ clientId, apiKey })};`;
}

export function getPortoneConfigJs(): string {
  ensurePingLocalEnv();
  const storeId = process.env.PORTONE_STORE_ID || "";
  const channelKey = process.env.PORTONE_CHANNEL_KEY || "";
  let tossPaymentsClientKey =
    process.env.TOSS_PAYMENTS_WIDGET_CLIENT_KEY ||
    process.env.TOSS_PAYMENTS_CLIENT_KEY ||
    process.env.TOSS_WIDGET_CLIENT_KEY ||
    process.env.PORTONE_CLIENT_KEY ||
    "";
  const useTossDocsTestKeys = pingEnvTruthy("PING_USE_TOSS_DOCS_TEST_KEYS");
  if (useTossDocsTestKeys) {
    tossPaymentsClientKey = TOSS_PAYMENTS_DOCS_WIDGET_CLIENT_KEY;
  }
  const tossConfirmMock = pingEnvTruthy("PING_TOSS_CONFIRM_MOCK");
  const tossAllowCkWidgetTry = pingEnvTruthy("PING_ALLOW_CK_WIDGET_TRY");
  const skipFirebaseStorageUpload = pingEnvTruthy(
    "PING_SKIP_FIREBASE_STORAGE_UPLOAD",
  );
  const backendApiOrigin = String(process.env.PING_BACKEND_API_ORIGIN || "")
    .trim()
    .replace(/\/+$/, "");
  const pingNextDevPort = Number(process.env.NEXT_DEV_PORT || "3002") || 3002;
  const portonePayload: Record<string, unknown> = {
    storeId,
    channelKey,
    tossPaymentsClientKey,
    tossConfirmMock,
    tossAllowCkWidgetTry,
    tossUseDocsTestKeys: useTossDocsTestKeys,
    skipFirebaseStorageUpload,
    pingNextDevPort,
  };
  if (backendApiOrigin) portonePayload.backendApiOrigin = backendApiOrigin;
  return `window.__PING_PORTONE_CONFIG__=${JSON.stringify(portonePayload)};`;
}
