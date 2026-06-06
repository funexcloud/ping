import { spawnSync } from "child_process";
import path from "path";
import type { NextConfig } from "next";
import legacyHtmlRewrites from "./next-legacy-html-rewrites.json";

/**
 * `next dev` 에서 instrumentation 은 첫 요청 이후에만 돌 수 있어 `/` 가 첫 로드에 404 가 난다.
 * 설정 로드 시점(서버가 요청을 받기 전)에 public 미러를 맞춘다.
 */
const root = process.cwd();
const skipPublicEnsure =
  process.env.PING_SKIP_NEXT_ENSURE === "1" || process.env.NODE_ENV === "development";

if (!skipPublicEnsure) {
  const r = spawnSync(
    process.execPath,
    [path.join(root, "scripts", "ensure-next-public-static.mjs")],
    { cwd: root, encoding: "utf8" },
  );
  if (r.status !== 0) {
    console.error(
      r.stderr || r.stdout || "[next.config] ensure-next-public-static exited non-zero",
    );
    throw new Error("ensure-next-public-static failed (set PING_SKIP_NEXT_ENSURE=1 to skip)");
  }
}

const legacy = legacyHtmlRewrites as { source: string; destination: string }[];

/** bugo-import.js 동적 로드 — cheerio 전이 의존성까지 Vercel 함수에 포함 */
const BUGO_IMPORT_TRACE_DEPS = [
  "boolbase",
  "cheerio",
  "cheerio-select",
  "css-select",
  "css-what",
  "dom-serializer",
  "domelementtype",
  "domhandler",
  "domutils",
  "encoding-sniffer",
  "entities",
  "htmlparser2",
  "iconv-lite",
  "nth-check",
  "parse5",
  "parse5-htmlparser2-tree-adapter",
  "parse5-parser-stream",
  "safer-buffer",
  "undici",
  "whatwg-encoding",
  "whatwg-mimetype",
].flatMap((pkg) => [`./node_modules/${pkg}/**`]);

const bugoImportTraceFiles = [
  "./bugo-import.js",
  "./lib/bugo-funeral-parse.cjs",
  "./bugo-message-template.js",
  "./lib/bugo-import-url.cjs",
  "./lib/bugo-import-url-rules.json",
  "./src/lib/ping-bugo-import-server.cjs",
  ...BUGO_IMPORT_TRACE_DEPS,
];

const memberAuthTraceFiles = [
  "./lib/ping-member-auth-app.cjs",
  "./lib/ping-member-store.cjs",
  "./lib/ping-oauth-signed.cjs",
  "./member-auth.js",
  "./ping-kakao-auth.js",
  "./guest-sms-auth.js",
  "./email-resend.js",
  "./six-digit-code.js",
  "./ping-dispatch/config.js",
  "./ping-dispatch/buildMessages.js",
  "./ping-dispatch/solapiChunks.js",
  "./scripts/solapi-auth-fetch.js",
];

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
  ],
  outputFileTracingIncludes: {
    "/api/import/bugo-funeral": bugoImportTraceFiles,
    "/api/import/wooribugo-funeral": bugoImportTraceFiles,
    "/api/auth/kakao/config": memberAuthTraceFiles,
    "/api/auth/kakao/callback": memberAuthTraceFiles,
    "/api/auth/login": memberAuthTraceFiles,
    "/api/guest-auth/config": memberAuthTraceFiles,
    "/api/admin/app-settings": memberAuthTraceFiles,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        aggregateTimeout: 300,
        ...(process.env.WATCHPACK_POLLING === "true" ? { poll: 1000 } : {}),
      };
    }
    return config;
  },
  async redirects() {
    return [
      { source: "/overview.html", destination: "/products/ping", permanent: true },
      { source: "/overview.html/", destination: "/products/ping", permanent: true },
      { source: "/overview", destination: "/products/ping", permanent: true },
      { source: "/overview/", destination: "/products/ping", permanent: true },
      { source: "/customer-center.html", destination: "/customer-center", permanent: true },
      { source: "/customer-center.html/", destination: "/customer-center", permanent: true },
      { source: "/partnership.html", destination: "/partnership", permanent: true },
      { source: "/partnership.html/", destination: "/partnership", permanent: true },
      { source: "/pricing.html", destination: "/pricing", permanent: true },
      { source: "/pricing.html/", destination: "/pricing", permanent: true },
      { source: "/inquiry-board.html", destination: "/inquiry-board", permanent: true },
      { source: "/inquiry-board.html/", destination: "/inquiry-board", permanent: true },
      { source: "/tech-blog.html", destination: "/tech-blog", permanent: true },
      { source: "/tech-blog.html/", destination: "/tech-blog", permanent: true },
      { source: "/guide-naver-contacts.html", destination: "/guide/naver-contacts", permanent: true },
      { source: "/guide-naver-contacts.html/", destination: "/guide/naver-contacts", permanent: true },
      { source: "/legal/terms-of-service.html", destination: "/legal/terms-of-service", permanent: true },
      { source: "/legal/terms-of-service.html/", destination: "/legal/terms-of-service", permanent: true },
      { source: "/legal/privacy-policy.html", destination: "/legal/privacy-policy", permanent: true },
      { source: "/legal/privacy-policy.html/", destination: "/legal/privacy-policy", permanent: true },
      { source: "/legal/refund-policy.html", destination: "/legal/refund-policy", permanent: true },
      { source: "/legal/refund-policy.html/", destination: "/legal/refund-policy", permanent: true },
      { source: "/legal/copyright.html", destination: "/legal/copyright", permanent: true },
      { source: "/legal/copyright.html/", destination: "/legal/copyright", permanent: true },
      {
        source: "/legal/service-payment-guide.html",
        destination: "/legal/service-payment-guide",
        permanent: true,
      },
      {
        source: "/legal/service-payment-guide.html/",
        destination: "/legal/service-payment-guide",
        permanent: true,
      },
      { source: "/checkout.html", destination: "/checkout", permanent: true },
      { source: "/checkout.html/", destination: "/checkout", permanent: true },
      { source: "/payment-success.html", destination: "/payment-success", permanent: true },
      { source: "/payment-success.html/", destination: "/payment-success", permanent: true },
      { source: "/send/url.html", destination: "/send/url", permanent: true },
      { source: "/send/url.html/", destination: "/send/url", permanent: true },
      { source: "/send/payments.html", destination: "/send/payments", permanent: true },
      { source: "/send/payments.html/", destination: "/send/payments", permanent: true },
      { source: "/obituary-member-login.html", destination: "/member-login", permanent: true },
      { source: "/obituary-member-login.html/", destination: "/member-login", permanent: true },
      {
        source: "/obituary/obituary-member-login.html",
        destination: "/member-login",
        permanent: true,
      },
      {
        source: "/obituary/obituary-member-login.html/",
        destination: "/member-login",
        permanent: true,
      },
      { source: "/login.html", destination: "/login", permanent: true },
      { source: "/login.html/", destination: "/login", permanent: true },
      { source: "/obituary-entry.html", destination: "/login", permanent: true },
      { source: "/obituary-entry.html/", destination: "/login", permanent: true },
      {
        source: "/obituary/obituary-entry.html",
        destination: "/login",
        permanent: true,
      },
      {
        source: "/obituary/obituary-entry.html/",
        destination: "/login",
        permanent: true,
      },
      { source: "/bulk", destination: "/start", permanent: true },
      { source: "/bulk/", destination: "/start", permanent: true },
      { source: "/index.html", destination: "/start", permanent: true },
      { source: "/intro.html", destination: "/intro", permanent: true },
      { source: "/intro.html/", destination: "/intro", permanent: true },
      { source: "/index", destination: "/start", permanent: true },
      { source: "/index/", destination: "/start", permanent: true },
      { source: "/obituary-review.html", destination: "/obituary/review", permanent: true },
      { source: "/obituary-review.html/", destination: "/obituary/review", permanent: true },
      { source: "/obituary/obituary-review.html", destination: "/obituary/review", permanent: true },
      { source: "/obituary/obituary-review.html/", destination: "/obituary/review", permanent: true },
      { source: "/obituary-public.html", destination: "/obituary/public", permanent: true },
      { source: "/obituary-public.html/", destination: "/obituary/public", permanent: true },
      { source: "/obituary/obituary-public.html", destination: "/obituary/public", permanent: true },
      { source: "/obituary/obituary-public.html/", destination: "/obituary/public", permanent: true },
      { source: "/mypage.html", destination: "/mypage/points", permanent: true },
      { source: "/mypage.html/", destination: "/mypage/points", permanent: true },
      { source: "/memorial-auth.html", destination: "/memorial/auth", permanent: true },
      { source: "/memorial-auth.html/", destination: "/memorial/auth", permanent: true },
      { source: "/memorial-list.html", destination: "/memorial/list", permanent: true },
      { source: "/memorial-list.html/", destination: "/memorial/list", permanent: true },
      { source: "/memorial-hall.html", destination: "/memorial/hall", permanent: true },
      { source: "/memorial-hall.html/", destination: "/memorial/hall", permanent: true },
      { source: "/admin-auth.html", destination: "/admin/auth", permanent: true },
      { source: "/admin-auth.html/", destination: "/admin/auth", permanent: true },
      { source: "/admin-dashboard.html", destination: "/admin/monitoring", permanent: true },
      { source: "/admin-dashboard.html/", destination: "/admin/monitoring", permanent: true },
      { source: "/unified-monitoring.html", destination: "/admin/monitoring", permanent: true },
      { source: "/unified-monitoring.html/", destination: "/admin/monitoring", permanent: true },
      { source: "/partner-dashboard.html", destination: "/admin/partner", permanent: true },
      { source: "/partner-dashboard.html/", destination: "/admin/partner", permanent: true },
      { source: "/service-status.html", destination: "/admin/service-status", permanent: true },
      { source: "/service-status.html/", destination: "/admin/service-status", permanent: true },
      { source: "/admin/admin-auth.html", destination: "/admin/auth", permanent: true },
      { source: "/admin/unified-monitoring.html", destination: "/admin/monitoring", permanent: true },
      { source: "/admin/service-status.html", destination: "/admin/service-status", permanent: true },
      { source: "/admin/partner-dashboard.html", destination: "/admin/partner", permanent: true },
      { source: "/obituary-send.html", destination: "/obituary/send", permanent: true },
      { source: "/obituary-send.html/", destination: "/obituary/send", permanent: true },
      { source: "/obituary-sales.html", destination: "/obituary/sales", permanent: true },
      { source: "/obituary-sales.html/", destination: "/obituary/sales", permanent: true },
      { source: "/obituary-mortuary.html", destination: "/obituary/mortuary", permanent: true },
      { source: "/obituary-mortuary.html/", destination: "/obituary/mortuary", permanent: true },
      { source: "/obituary/obituary-send.html", destination: "/obituary/send", permanent: true },
      { source: "/obituary/obituary-send.html/", destination: "/obituary/send", permanent: true },
      { source: "/obituary/obituary-sales.html", destination: "/obituary/sales", permanent: true },
      { source: "/obituary/obituary-sales.html/", destination: "/obituary/sales", permanent: true },
      { source: "/obituary/obituary-mortuary.html", destination: "/obituary/mortuary", permanent: true },
      { source: "/obituary/obituary-mortuary.html/", destination: "/obituary/mortuary", permanent: true },
      { source: "/saas-landing.html", destination: "/saas", permanent: true },
      { source: "/saas-landing.html/", destination: "/saas", permanent: true },
      { source: "/stitch-wave.html", destination: "/stitch-wave", permanent: true },
      { source: "/stitch-wave.html/", destination: "/stitch-wave", permanent: true },
      { source: "/setup-finish.html", destination: "/setup-finish", permanent: true },
      { source: "/setup-finish.html/", destination: "/setup-finish", permanent: true },
      { source: "/ping-cx-flow.html", destination: "/intro", permanent: true },
      { source: "/ping-cx-flow.html/", destination: "/intro", permanent: true },
      { source: "/ping-cx-flow", destination: "/intro", permanent: true },
      { source: "/ping-cx-flow/", destination: "/intro", permanent: true },
    ];
  },
  async rewrites() {
    return {
      /**
       * - `/` 는 App Router `app/page.tsx`(인트로 게이트 → `/start`)로 처리.
       * - `/index.html` 은 `redirects` 로 `/start` (301).
       * - `/login` 은 App Router — 레거시 진입 `.html` 은 `redirects` 로 `/login` 캐논(301).
       */
      beforeFiles: [
        {
          source: "/api/google-oauth-config.js",
          destination: "/api/ping-config-google",
        },
        {
          source: "/api/portone-config.js",
          destination: "/api/ping-config-portone",
        },
        ...legacy,
      ],
    };
  },
};

export default nextConfig;
