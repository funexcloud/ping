"use client";

import { PhoneMockup } from "@/components/ping-mobile/phone-mockup";
import { PingMobileSendingScreen } from "@/components/ping-mobile/ping-mobile-screens";

export function IntroReachPhones() {
  return (
    <div className="intro-reach-phones grid gap-3 md:grid-cols-3" aria-hidden>
      {["문자", "카카오", "결과"].map((label, index) => (
        <div key={label} className="text-center">
          <PhoneMockup compact showStatusBar={false}>
            {index === 2 ? (
              <PingMobileSendingScreen sent={173} total={328} />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-sm font-semibold text-[var(--ping-ui-text,#191f28)]">
                {label}
              </div>
            )}
          </PhoneMockup>
          <p className="mt-3 text-center text-sm font-semibold">{label}</p>
        </div>
      ))}
    </div>
  );
}
