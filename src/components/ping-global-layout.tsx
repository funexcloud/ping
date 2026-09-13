"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { BulkFlowLogoBar } from "@/components/bulk/bulk-flow-logo-bar";
import { PingDevIdentitySkipBar } from "@/components/bulk/ping-dev-flow-skip-button";
import { PingAppCheckBootstrap } from "@/components/ping-app-check-bootstrap";
import { PingFunexSessionHydrate } from "@/components/ping-funex-session-hydrate";
import { PingKeyboardInset } from "@/components/ping-mobile/ping-keyboard-inset";
import { PingSiteLegalFooter } from "@/components/ping-site-legal-footer";
import {
  isPingMarketingMemberLogin,
  isPingMarketingResponsivePath,
} from "@/components/marketing-responsive";
import {
  isPingDevCondolenceTourLocation,
  isPingDevFlowSkipEnabled,
} from "@/lib/ping-dev-flow-skip";

/** 전역 로고 헤더를 숨길 경로 — 홈(랜딩)·마케팅 PC·관리자·풀스크린 연출 */
const HIDE_HEADER_EXACT = [
  "/",
  "/intro",
  "/stitch-wave",
  "/ping-cx-flow",
  "/flower",
  "/console",
  "/condolence",
  "/obituary/public",
  "/start",
] as const;
/** 전역 푸터를 숨길 경로 — 관리자·풀스크린·마케팅 PC(자체 푸터)·디지털 방명록 */
const HIDE_FOOTER_EXACT = [
  "/intro",
  "/stitch-wave",
  "/ping-cx-flow",
  "/condolence",
  "/obituary-form",
  "/mourner-info",
  "/mourner-account",
  "/obituary/public",
  "/start",
] as const;
const HIDE_PREFIXES = ["/admin", "/condolence/", "/tv/"] as const;
/** 580px 제품 열 제외 — PC·태블릿 반응형(방명록 720px 등) */
const FULL_WIDTH_EXACT = ["/flower", "/console", "/condolence", "/intro", "/start"] as const;
const FULL_WIDTH_PREFIXES = ["/condolence/", "/tv/"] as const;

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => {
    const bare = prefix.replace(/\/$/, "");
    return pathname === bare || pathname.startsWith(`${bare}/`);
  });
}

export function PingGlobalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const marketingPc =
    isPingMarketingResponsivePath(pathname) ||
    isPingMarketingMemberLogin(pathname, searchParams.get("from"));
  const hideHeader =
    marketingPc ||
    (HIDE_HEADER_EXACT as readonly string[]).includes(pathname) ||
    matchesPrefix(pathname, HIDE_PREFIXES);
  const hideFooter =
    marketingPc ||
    (HIDE_FOOTER_EXACT as readonly string[]).includes(pathname) ||
    matchesPrefix(pathname, HIDE_PREFIXES);
  const fullWidth =
    marketingPc ||
    (FULL_WIDTH_EXACT as readonly string[]).includes(pathname) ||
    matchesPrefix(pathname, FULL_WIDTH_PREFIXES);
  const condolencePage =
    pathname.startsWith("/condolence/") &&
    pathname !== "/condolence/login" &&
    !pathname.startsWith("/condolence/signup/");
  const condolenceAuthFlowPage =
    pathname === "/condolence/login" || pathname.startsWith("/condolence/signup/");
  const showCondolenceDevSkip =
    isPingDevFlowSkipEnabled() &&
    isPingDevCondolenceTourLocation(pathname, searchParams.toString());

  return (
    <div
      className={`ping-global-root flex min-h-dvh w-full flex-col bg-background${
        condolenceAuthFlowPage
          ? " ping-global-root--condolence-login items-stretch"
          : condolencePage
            ? " ping-global-root--condolence items-center"
            : " items-center"
      }`}
    >
      <PingAppCheckBootstrap />
      <PingFunexSessionHydrate />
      <PingKeyboardInset />
      <div
        className={`ping-global-main flex min-h-0 w-full flex-1 flex-col ${
          fullWidth ? "max-w-none" : "max-w-[var(--ping-column-max)] bg-white"
        }${
          condolencePage ? " ping-global-main--condolence" : ""
        }${
          condolenceAuthFlowPage ? " ping-global-main--condolence-login" : ""
        }`}
      >
        {!hideHeader ? <BulkFlowLogoBar /> : null}
        {children}
        {!hideFooter ? (
          <div className="ping-global-footer-slot w-full shrink-0">
            <PingSiteLegalFooter />
          </div>
        ) : null}
      </div>
      {showCondolenceDevSkip ? <PingDevIdentitySkipBar elevated /> : null}
    </div>
  );
}
