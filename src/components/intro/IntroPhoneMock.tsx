"use client";

import { PhoneMockup } from "@/components/ping-mobile/phone-mockup";

export function IntroPhoneMock({ html, label }: { html: string; label: string }) {
  return (
    <figure className="intro-phone-mock-figure m-0">
      <figcaption className="mb-2 text-center text-xs font-semibold text-[var(--ping-ui-text,#191f28)]">
        {label}
      </figcaption>
      <PhoneMockup compact showStatusBar={false}>
        <div
          className="min-h-full bg-white p-4 text-[var(--ping-ui-text,#191f28)]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </PhoneMockup>
    </figure>
  );
}
