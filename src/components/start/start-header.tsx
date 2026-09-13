"use client";

import { ChevronLeft, Menu } from "lucide-react";
import { useState } from "react";

import { PingBrandLogo } from "@/components/brand/ping-brand-logo";
import { BulkSideMenu } from "@/components/bulk/bulk-side-menu";

export const START_WIZARD_TOTAL_STEPS = 5;

type StartHeaderProps = {
  currentStep: number;
  onBack?: () => void;
  showBack?: boolean;
  totalSteps?: number;
};

export function StartHeader({
  currentStep,
  onBack,
  showBack = false,
  totalSteps = START_WIZARD_TOTAL_STEPS,
}: StartHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="ping-start__header" aria-label="PING 발송 단계">
        <div className="ping-start__header-brand">
          {showBack ? (
            <button type="button" className="ping-start__header-button" aria-label="이전" onClick={onBack}>
              <ChevronLeft aria-hidden="true" />
            </button>
          ) : null}
          <a href="/intro" className="ping-start__brand-link" aria-label="PING 소개로 이동">
            <PingBrandLogo variant="horizontal" />
          </a>
        </div>
        <div className="ping-start__header-actions">
          <span className="ping-start__step-count" aria-label={`${currentStep} / ${totalSteps} 단계`}>
            <strong>{currentStep}</strong> / {totalSteps}
          </span>
          <button
            type="button"
            className="ping-start__header-button"
            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <Menu aria-hidden="true" />
          </button>
        </div>
      </header>
      <BulkSideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
