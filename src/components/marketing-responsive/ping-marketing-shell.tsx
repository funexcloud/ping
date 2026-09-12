"use client";

import "./ping-marketing-responsive.css";

import {
  PING_MARKETING_HOME_HREF,
  PING_MARKETING_INFO_LINKS,
  PING_MARKETING_USE_HREF,
  pingMarketingHeaderNavLinks,
  pingMarketingUtilityLinks,
  pingMarketingLegalLinks,
  type PingMarketingNavLink,
} from "@/components/marketing-responsive/ping-marketing-nav-config";
import { PingMarketingSlashCtaRow } from "@/components/marketing-responsive/ping-slash-button";
import { ScrollToTopButton } from "@/components/marketing-responsive/ScrollToTopButton";
import { PingCompanyLegalFooterBody } from "@/components/ping-company-legal-footer-body";
import { usePingMemberSession } from "@/hooks/use-ping-member-session";
import { PingBrandLogo } from "@/components/brand/ping-brand-logo";
import { pingTrack } from "@/lib/ping-analytics";
import { PING_COMPANY_LEGAL } from "@/lib/ping-company-legal";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";

function navItemPathname(href: string): string {
  return href.split("?")[0].split("#")[0];
}

function NavLink({
  item,
  activePath,
  onNavigate,
  className,
}: {
  item: PingMarketingNavLink;
  activePath?: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const isActive =
    !item.external && activePath != null && navItemPathname(item.href) === activePath;
  const cls = cn(isActive && "ping-mkt__nav-link--active", className);

  if (item.external) {
    return (
      <a href={item.href} className={cls} onClick={onNavigate}>
        {item.label}
      </a>
    );
  }

  if (item.href.startsWith("#")) {
    return (
      <a href={item.href} className={cls} onClick={onNavigate}>
        {item.label}
      </a>
    );
  }

  return (
    <Link href={item.href} className={cls} onClick={onNavigate}>
      {item.label}
    </Link>
  );
}

function MarketingHeaderCtas({
  isLoggedIn,
  stack = false,
  onNavigate,
}: {
  isLoggedIn: boolean;
  stack?: boolean;
  onNavigate?: () => void;
}) {
  const account = pingMarketingUtilityLinks(isLoggedIn)[0];
  if (!account) return null;

  return (
    <div className={cn("ping-mkt__header-ctas", stack && "ping-mkt__header-ctas--stack")}>
      <Link
        href={account.href}
        className="ping-mkt__header-btn ping-mkt__header-btn--ghost"
        onClick={onNavigate}
      >
        {account.label}
      </Link>
      <Link
        href={PING_MARKETING_USE_HREF}
        className="ping-mkt__header-btn ping-mkt__header-btn--solid"
        onClick={() => {
          pingTrack("start_click");
          onNavigate?.();
        }}
      >
        부고 보내기
      </Link>
    </div>
  );
}

function MarketingHeader({
  activePath,
  headerMode = "full",
  homeHref = PING_MARKETING_HOME_HREF,
}: {
  activePath?: string;
  headerMode?: "full" | "b2c";
  homeHref?: string;
}) {
  const drawerId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isLoggedIn = usePingMemberSession();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const desktopLinks = pingMarketingHeaderNavLinks(isLoggedIn);
  const drawerLinks = desktopLinks;

  const isB2c = headerMode === "b2c";

  return (
    <>
      {isB2c ? (
        <header className="ping-mkt__header ping-mkt__header--flow ping-mkt__header--b2c-mobile">
          <div className="ping-mkt__header-inner ping-mkt__header-inner--b2c">
            <Link href={homeHref} className="ping-mkt__logo shrink-0" aria-label="PING 홈">
              <PingBrandLogo variant="horizontal" />
            </Link>
            <Link
              href={PING_MARKETING_USE_HREF}
              className="ping-mkt__b2c-start-link text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              onClick={() => pingTrack("start_click")}
            >
              부고 보내기
            </Link>
          </div>
        </header>
      ) : null}

      <header
        className={cn(
          "ping-mkt__header",
          isB2c && "ping-mkt__header--b2c-desktop",
          scrolled && "ping-mkt__header--scrolled",
        )}
      >
      <div className="ping-mkt__header-inner">
        <Link href={homeHref} className="ping-mkt__logo shrink-0" aria-label="PING 홈">
          <PingBrandLogo variant="horizontal" />
        </Link>

        <div className="ping-mkt__header-actions">
          <nav className="ping-mkt__nav-desktop" aria-label="주요 메뉴">
            {desktopLinks.map((item) => (
              <NavLink key={`${item.href}-${item.label}`} item={item} activePath={activePath} />
            ))}
          </nav>

          <div className="ping-mkt__cta-desktop">
            <MarketingHeaderCtas isLoggedIn={isLoggedIn} />
          </div>

          <button
            type="button"
            className="ping-mkt__menu-btn"
            aria-expanded={menuOpen}
            aria-controls={drawerId}
            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X aria-hidden /> : <Menu aria-hidden />}
          </button>
        </div>
      </div>

      <div
        id={drawerId}
        className={cn("ping-mkt__drawer", menuOpen && "ping-mkt__drawer--open")}
        hidden={!menuOpen}
      >
        <div className="ping-mkt__drawer-inner">
          <nav className="ping-mkt__drawer-nav" aria-label="모바일 메뉴">
            {drawerLinks.map((item) => (
              <NavLink
                key={`drawer-${item.href}-${item.label}`}
                item={item}
                activePath={activePath}
                onNavigate={closeMenu}
              />
            ))}
          </nav>
          <div className="ping-mkt__drawer-cta">
            <MarketingHeaderCtas isLoggedIn={isLoggedIn} stack onNavigate={closeMenu} />
          </div>
        </div>
      </div>
    </header>
    </>
  );
}

function MarketingFooter({ pingReturn }: { pingReturn: string }) {
  const legal = pingMarketingLegalLinks(pingReturn);

  return (
    <footer className="ping-mkt__footer">
      <div className="ping-mkt__footer-inner">
        <PingCompanyLegalFooterBody className="ping-mkt__footer-legal" />
        <nav className="ping-mkt__footer-nav" aria-label="안내·약관">
          {PING_MARKETING_INFO_LINKS.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          {legal.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="ping-mkt__footer-copy">
          Copyright ⓒ 2026 {PING_COMPANY_LEGAL.copyrightHolder}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export type PingMarketingShellProps = {
  children: ReactNode;
  /** `main` 바깥·푸터 직전 (예: `#start` CTA) */
  belowMain?: ReactNode;
  variant: "landing" | "info";
  /** B2C 랜딩: 모바일은 로고+시작, PC(768px+)는 full 헤더 */
  headerMode?: "full" | "b2c";
  /** 로고·홈 링크 (기본: 소비자 `/`) */
  homeHref?: string;
  /** 정보 페이지 현재 경로 — 활성 메뉴 표시 */
  activePath?: string;
  /** 약관 `pingReturn` 쿼리 값 */
  footerPingReturn?: string;
  className?: string;
};

export function PingMarketingShell({
  children,
  belowMain,
  variant,
  headerMode = "full",
  homeHref,
  activePath,
  footerPingReturn = "products-ping",
  className,
}: PingMarketingShellProps) {
  return (
    <div className={cn("ping-mkt", variant === "landing" ? "ping-mkt--landing" : "ping-mkt--info", className)}>
      <MarketingHeader
        activePath={activePath}
        headerMode={headerMode}
        homeHref={homeHref}
      />
      <main className="ping-mkt__main">{children}</main>
      {belowMain}
      {variant === "landing" ? <ScrollToTopButton /> : null}
      <MarketingFooter pingReturn={footerPingReturn} />
    </div>
  );
}

export function PingMarketingPageHero({
  kicker,
  title,
  lead,
}: {
  kicker: string;
  title: string;
  lead: string;
}) {
  return (
    <section className="ping-mkt__page-hero">
      <span className="ping-mkt__page-kicker">{kicker}</span>
      <h1 className="ping-mkt__page-title">{title}</h1>
      <p className="ping-mkt__page-lead">{lead}</p>
    </section>
  );
}

export function PingMarketingCtaRow({ className }: { className?: string }) {
  return <PingMarketingSlashCtaRow className={className} />;
}
