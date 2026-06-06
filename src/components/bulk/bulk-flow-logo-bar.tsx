"use client";

import Link from "next/link";
import { useState } from "react";

import { BulkSideMenu } from "@/components/bulk/bulk-side-menu";

import "./bulk-flow-logo-bar.css";

/**
 * 전역 상단 바 — PING 로고(홈 링크) + 우측 햄버거 메뉴.
 * 홈(`/`)을 제외한 전역에서 `PingGlobalLayout`이 렌더한다.
 */
export function BulkFlowLogoBar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="bulk-flow-logo-bar" aria-label="PING">
        <Link href="/" className="bulk-flow-logo-bar__home" aria-label="홈으로">
          <img
            src="/ping_logo_svg.svg"
            alt="PING"
            className="bulk-flow-logo-bar__img"
          />
        </Link>
        <button
          type="button"
          className={`hamburger-menu ${menuOpen ? "active" : ""}`}
          aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </header>

      <BulkSideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
