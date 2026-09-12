"use client";

import type { RefObject } from "react";
import { BulkFlowProgress } from "@/components/bulk/bulk-flow-progress";
import { BULK_FLOW_STEP_COPY } from "@/lib/ping-flow-step-copy";

const URL_STEP_COPY = BULK_FLOW_STEP_COPY[1];

type HeroStartUrlStepPreviewProps = {
  inputRef?: RefObject<HTMLInputElement | null>;
  /** GSAP 타이핑·스캔용 — 실제 `/start` URL 입력과 동일 마크업 */
  inputClassName?: string;
  defaultValue?: string;
};

/** Hero 폰 목업 — `/start` URL 단계와 동일 DOM·클래스 (로직 없음) */
export function HeroStartUrlStepPreview({
  inputRef,
  inputClassName,
  defaultValue = "",
}: HeroStartUrlStepPreviewProps) {
  return (
    <div className="app-shell bulk-entry-shell intro-hero__bulk-shell relative flex min-h-0 w-full flex-col overflow-hidden">
      <header className="ping-top-nav ping-top-nav--balanced">
        <span className="ping-top-nav__spacer" aria-hidden="true" />
        <h1 className="ping-top-nav__title">{URL_STEP_COPY.title}</h1>
      </header>

      <BulkFlowProgress currentStep={1} />

      <main
        className="index-main-flow flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden bg-[var(--ping-surface)] px-0"
        id="hero-bulk-main"
      >
        <section
          className="bulk-url-step mb-0 flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--ping-surface)] px-0"
          aria-label="부고 주소 입력"
        >
          <div className="flex min-h-0 flex-col bg-[var(--ping-surface)] px-5 pb-4 pt-3">
            <div className="bulk-url-step__card ping-bordered-panel relative mb-3 min-w-0 max-w-full p-5">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-[color:var(--primary)]">
                부고 발송
              </p>
              <div className="ping-step-head ping-step-head--panel mb-4">
                <p className="ping-step-head__sub">{URL_STEP_COPY.subtitle}</p>
              </div>

              <div className="bulk-url-step__input-wrap">
                <label htmlFor="hero-demo-url" className="sr-only">
                  부고 주소 URL
                </label>
                <input
                  ref={inputRef}
                  id="hero-demo-url"
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  readOnly
                  tabIndex={-1}
                  aria-hidden="true"
                  defaultValue={defaultValue}
                  className={
                    inputClassName ??
                    "input-field ping-field-standard hero-paste w-full max-w-full min-w-0"
                  }
                  placeholder="https://로 시작하는 주소"
                />
                <span className="hero-caret intro-hero__input-caret" aria-hidden>
                  |
                </span>
                <div className="intro-hero__scan" aria-hidden />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
