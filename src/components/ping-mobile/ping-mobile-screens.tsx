"use client";

import { PingBrandLogo } from "@/components/brand/ping-brand-logo";
import { cn } from "@/lib/utils";

const DEMO_CONTACTS = [
  { name: "김지훈", phone: "010-1234-****", selected: true, initial: "김" },
  { name: "이서연", phone: "010-2345-****", selected: true, initial: "이" },
  { name: "박민수", phone: "010-3456-****", selected: false, initial: "박" },
  { name: "정하은", phone: "010-4567-****", selected: false, initial: "정" },
  { name: "최도윤", phone: "010-5678-****", selected: false, initial: "최" },
  { name: "한예진", phone: "010-6789-****", selected: false, initial: "한" },
] as const;

function MobileHeader({ stepLabel }: { stepLabel?: string }) {
  return (
    <header className="ping-mobile-header">
      <span className="ping-mobile-header__brand">
        <PingBrandLogo variant="horizontal" />
      </span>
      <span className="ping-mobile-header__meta">
        {stepLabel ? <span>{stepLabel}</span> : null}
        <span aria-hidden>☰</span>
      </span>
    </header>
  );
}

export function PingMobileContactsScreen() {
  return (
    <div className="ping-mobile-screen">
      <MobileHeader stepLabel="1 / 6" />
      <div className="ping-mobile-body">
        <h2 className="ping-mobile-title">연락처</h2>
        <p className="ping-mobile-count-line">
          내 연락처 <strong>328명</strong>
        </p>
        <div className="ping-mobile-search" aria-hidden>
          이름 또는 전화번호 검색
        </div>
        <div className="ping-mobile-list">
          {DEMO_CONTACTS.map((row) => (
            <div key={row.phone} className="ping-mobile-row">
              <span className={cn("ping-mobile-check", row.selected && "is-on")} />
              <span className="ping-mobile-avatar">{row.initial}</span>
              <div className="ping-mobile-row__text">
                <p className="ping-mobile-row__name">{row.name}</p>
                <p className="ping-mobile-row__phone">{row.phone}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="ping-mobile-footer">
        <span className="ping-mobile-cta">연락처 가져오기</span>
      </div>
    </div>
  );
}

export type PingMobileSendingProps = {
  sent?: number;
  total?: number;
  contactsDone?: boolean;
  chrome?: boolean;
};

export function PingMobileSendingScreen({
  sent = 173,
  total = 328,
  contactsDone = true,
  chrome = true,
}: PingMobileSendingProps) {
  const pct = total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0;
  return (
    <div className="ping-mobile-screen">
      {chrome ? <MobileHeader /> : null}
      <div className="ping-mobile-body">
        <h2 className="ping-mobile-title">발송 중</h2>
        <div className="ping-mobile-signal">
          <PingBrandLogo variant="mark" />
        </div>
        <p className="ping-mobile-ratio">
          {sent.toLocaleString("ko-KR")}
          <span> / {total.toLocaleString("ko-KR")}</span>
        </p>
        <div className="ping-mobile-progress" aria-hidden>
          <span style={{ width: `${pct}%` }} />
        </div>
        <ul className="ping-mobile-steps">
          <li>
            <span className={cn("ping-mobile-steps__dot", contactsDone && "is-done")} />
            연락처 확인 중
            <span className="ping-mobile-steps__count">{total.toLocaleString("ko-KR")}명</span>
          </li>
          <li>
            <span className="ping-mobile-steps__dot is-active" />
            메시지 발송 중
            <span className="ping-mobile-steps__count is-active">
              {sent.toLocaleString("ko-KR")}명
            </span>
          </li>
          <li>
            <span className="ping-mobile-steps__dot" />
            전달 결과 수신 중
            <span className="ping-mobile-steps__count">-</span>
          </li>
        </ul>
        <p className="ping-mobile-wait">
          잠시만 기다려주세요.
          <br />
          PING이 안전하게 전달하고 있습니다.
        </p>
      </div>
    </div>
  );
}

export type PingMobileCompletionProps = {
  delivered?: number;
  success?: number;
  needsReview?: number;
  chrome?: boolean;
};

export function PingMobileCompletionScreen({
  delivered = 173,
  success = 171,
  needsReview = 2,
  chrome = true,
}: PingMobileCompletionProps) {
  return (
    <div className="ping-mobile-screen">
      {chrome ? <MobileHeader /> : null}
      <div className="ping-mobile-body">
        <h2 className="ping-mobile-title">발송 완료</h2>
        <div className="ping-mobile-success-mark" aria-hidden>
          ✓
        </div>
        <p className="ping-mobile-complete-lead">
          <strong>{delivered.toLocaleString("ko-KR")}명에게</strong>
          <br />
          전달되었습니다.
        </p>
        <div className="ping-mobile-mini-stats">
          <span>발송 성공 {success.toLocaleString("ko-KR")}</span>
          <span>확인 필요 {needsReview.toLocaleString("ko-KR")}</span>
        </div>
      </div>
      {chrome ? (
        <div className="ping-mobile-footer">
          <span className="ping-mobile-cta">다음</span>
        </div>
      ) : null}
    </div>
  );
}
