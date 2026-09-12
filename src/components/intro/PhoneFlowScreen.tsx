"use client";

import { Link2 } from "lucide-react";
import { PingMobileCompletionScreen, PingMobileSendingScreen } from "@/components/ping-mobile/ping-mobile-screens";
import { HeroStartUrlStepPreview } from "@/components/intro/HeroStartUrlStepPreview";
import {
  DEMO_FUNERAL_URL,
  DEMO_OBITUARY,
  type PhoneFlowStepKey,
} from "@/lib/intro/phone-flow-config";

const PARSED_ROWS = [
  { label: "고인", value: "김영수(金永洙)" },
  { label: "빈소", value: "울산하늘공원 3호실" },
  { label: "발인", value: "6월 20일 오전 7시" },
];

const SAFE_LINKS = [
  { name: "김○○", href: "/s/a1b2c3" },
  { name: "이○○", href: "/s/d4e5f6" },
  { name: "박○○", href: "/s/g7h8i9" },
];

type PhoneFlowScreenProps = {
  step: PhoneFlowStepKey;
  /** 스크롤 진행도 0–1 (dispatch·result 카운터용) */
  progress?: number;
};

export function PhoneFlowScreen({ step, progress = 0 }: PhoneFlowScreenProps) {
  switch (step) {
    case "paste":
      return <HeroStartUrlStepPreview defaultValue={DEMO_FUNERAL_URL} />;
    case "parse":
      return <ParseScreen />;
    case "safelink":
      return <SafelinkScreen />;
    case "dispatch":
      return <DispatchScreen progress={progress} />;
    case "result":
      return <ResultScreen progress={progress} />;
    default:
      return null;
  }
}

function ParseScreen() {
  return (
    <div className="phone-flow-screen phone-flow-screen--shell">
      <div className="phone-flow-screen__panel ping-bordered-panel p-5">
        <p className="phone-flow-screen__eyebrow">정보 인식</p>
        <h3 className="phone-flow-screen__title">부고 내용을 읽었어요</h3>
        <pre className="phone-flow-screen__paste">{DEMO_OBITUARY}</pre>
        <dl className="phone-flow-screen__fields">
          {PARSED_ROWS.map((row) => (
            <div key={row.label} className="phone-flow-screen__field">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function SafelinkScreen() {
  return (
    <div className="phone-flow-screen phone-flow-screen--shell">
      <div className="phone-flow-screen__panel ping-bordered-panel p-5">
        <p className="phone-flow-screen__eyebrow">보안 변환</p>
        <h3 className="phone-flow-screen__title">수신자별 Safe Link</h3>
        <ul className="phone-flow-screen__links">
          {SAFE_LINKS.map((row) => (
            <li key={row.name} className="phone-flow-screen__link-row">
              <span>{row.name}</span>
              <code>
                <Link2 aria-hidden strokeWidth={2} />
                {row.href}
              </code>
            </li>
          ))}
        </ul>
        <p className="phone-flow-screen__hint">외부 URL은 노출되지 않습니다.</p>
      </div>
    </div>
  );
}

function DispatchScreen({ progress }: { progress: number }) {
  const sent = Math.round(progress * 173) || 173;
  return <PingMobileSendingScreen sent={sent} total={328} />;
}

function ResultScreen({ progress }: { progress: number }) {
  const delivered = Math.round(Math.max(progress, 0.85) * 173);
  return (
    <PingMobileCompletionScreen
      delivered={delivered}
      success={Math.max(delivered - 2, 0)}
      needsReview={2}
    />
  );
}
