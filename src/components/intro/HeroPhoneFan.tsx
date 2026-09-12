"use client";

import { PhoneMockup } from "@/components/ping-mobile/phone-mockup";
import {
  PingMobileCompletionScreen,
  PingMobileContactsScreen,
  PingMobileSendingScreen,
} from "@/components/ping-mobile/ping-mobile-screens";

const FAN_SCREENS = [
  { label: "연락처", node: <PingMobileContactsScreen /> },
  { label: "발송 중", node: <PingMobileSendingScreen /> },
  { label: "발송 완료", node: <PingMobileCompletionScreen /> },
] as const;

/** 연락처 → 발송 중 → 완료 — canonical mockup */
export function HeroPhoneFan() {
  return (
    <div className="hero-phone-fan" aria-label="PING 모바일 발송 미리보기">
      <ol className="hero-phone-fan__list">
        {FAN_SCREENS.map((screen, index) => (
          <li
            key={screen.label}
            className="hero-phone-fan__slot"
            data-slot={index}
            aria-label={screen.label}
          >
            <figure className="m-0">
              <figcaption className="mb-2 text-center text-xs font-semibold text-[var(--ping-ui-text,#191f28)]">
                {screen.label}
              </figcaption>
              <PhoneMockup showStatusBar={index === 1}>
                {screen.node}
              </PhoneMockup>
            </figure>
          </li>
        ))}
      </ol>
    </div>
  );
}
