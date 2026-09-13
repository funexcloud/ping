"use client";

import Link from "next/link";
import { type MouseEvent, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  FileText,
  Heart,
  Lock,
  Menu,
  Play,
  Search,
  Send,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

import { PingBrandLogo } from "@/components/brand/ping-brand-logo";
import { LandingStartLink } from "@/components/landing/landing-start-link";
import { PhoneMockup } from "@/components/ping-mobile/phone-mockup";
import { LANDING_START_HREF } from "@/content/landing/landing-config";
import { PING_LOGO_CANONICAL_SRC } from "@/lib/ping-brand";

const START_HREF = LANDING_START_HREF;
const LOGIN_HREF = "/login";

const NAV = [
  { label: "서비스 소개", href: "#intro-hero" },
  { label: "이용 방법", href: "#intro-how" },
  { label: "부고장 템플릿", href: "/obituary-form" },
  { label: "요금안내", href: "/pricing" },
  { label: "자주 묻는 질문", href: "/customer-center#faq" },
] as const;

const CONTACTS = [
  { name: "김영수", phone: "010-1234-****", selected: true, tone: "warm" as const },
  { name: "이서연", phone: "010-2345-****", selected: true, tone: "rose" as const },
  { name: "박민수", phone: "010-3456-****", selected: false, tone: "sand" as const },
  { name: "정하은", phone: "010-4567-****", selected: false, tone: "gray" as const, initial: "정" },
  { name: "최도윤", phone: "010-5678-****", selected: false, tone: "blue" as const },
  { name: "한예진", phone: "010-6789-****", selected: false, tone: "gray" as const, initial: "한" },
];

const STEPS = [
  { title: "부고 정보 불러오기", lines: ["부고 링크 또는 내용을", "불러옵니다."], Icon: FileText },
  { title: "연락처 가져오기", lines: ["휴대폰 연락처를", "한 번에 불러옵니다."], Icon: UserPlus },
  { title: "발송 대상 선택", lines: ["가족, 친척, 지인 등", "필요한 분들을 선택합니다."], Icon: Users },
  { title: "발송 준비 및 결제", lines: ["내용을 확인하고", "발송을 준비합니다."], Icon: CreditCard },
  { title: "발송 완료", lines: ["소중한 분들에게", "부고가 전달되었습니다."], Icon: Send },
] as const;

const TRUST: Array<{
  title: string;
  desc: string;
  icon: (props: { size?: number; strokeWidth?: number }) => ReactNode;
}> = [
  { title: "정확한 발송", desc: "중복 없이, 빠르고 정확하게", icon: (props) => <Send {...props} /> },
  { title: "개인정보 보호", desc: "연락처는 기기에만 저장", icon: (props) => <Lock {...props} /> },
  { title: "간편한 사용", desc: "누구나 쉽게 3분이면 충분합니다", icon: (props) => <Users {...props} /> },
  { title: "따뜻한 마음", desc: "소중한 인연을 잇는 마음으로", icon: (props) => <Heart {...props} /> },
];

const CLEAR_BULK_KEYS = [
  "ping_bulk_recipients",
  "ping_bulk_flags",
  "ping_bulk_identity_ok",
  "ping_from_index",
  "ping_send_channel",
  "ping_flow_route",
  "ping_flow_started",
  "ping_obituary_public_url",
  "ping_wizard_draft",
  "ping_pay_success_session",
  "ping_pay_success_recipients",
  "ping_checkout_session",
  "ping_toss_pending",
  "ping_compose_image_data",
];

function markIntroSeenAndFreshStart(): void {
  try {
    sessionStorage.setItem("ping_intro_seen", "1");
    for (const key of CLEAR_BULK_KEYS) sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function onStartClick(_e: MouseEvent<HTMLAnchorElement>): void {
  markIntroSeenAndFreshStart();
}

function ContactAvatar({ tone, initial }: { tone: string; initial?: string }) {
  return (
    <span className={`intro-contact-avatar intro-contact-avatar--${tone}`} aria-hidden="true">
      {initial ? (
        <span className="intro-contact-initial">{initial}</span>
      ) : (
        <span className="intro-contact-portrait">
          <span className="intro-contact-head" />
          <span className="intro-contact-shoulders" />
        </span>
      )}
    </span>
  );
}

function ContactPhone() {
  return (
    <div className="intro-phone-stage" aria-label="PING 연락처 선택 화면 예시">
      <div className="intro-signal intro-signal--top" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="intro-floating-app" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PING_LOGO_CANONICAL_SRC} alt="" />
        <span>PING</span>
      </div>
      <div className="intro-signal intro-signal--bottom" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>

      <PhoneMockup className="intro-phone-frame" showStatusBar={false}>
        <div className="intro-phone-screen">
          <div className="intro-phone-header">
            <PingBrandLogo variant="horizontal" className="intro-phone-logo" />
            <span className="intro-phone-progress">
              <b>1</b> / 6
            </span>
            <Menu size={25} strokeWidth={1.8} aria-hidden="true" />
          </div>
          <div className="intro-phone-content">
            <h2>연락처</h2>
            <p className="intro-phone-count">
              내 연락처 <strong>328명</strong>
            </p>
            <div className="intro-phone-search" aria-hidden="true">
              <Search size={18} strokeWidth={2} />
              <span>이름 또는 전화번호 검색</span>
            </div>
            <ul className="intro-contact-list" aria-label="선택된 연락처 예시">
              {CONTACTS.map((row) => (
                <li key={row.name}>
                  <span className={`intro-contact-check${row.selected ? " is-selected" : ""}`}>
                    {row.selected ? <Check size={14} strokeWidth={3} /> : null}
                  </span>
                  <ContactAvatar tone={row.tone} initial={"initial" in row ? row.initial : undefined} />
                  <span className="intro-contact-copy">
                    <strong>{row.name}</strong>
                    <small>{row.phone}</small>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="intro-phone-footer">연락처 가져오기</div>
        </div>
      </PhoneMockup>
      <p className="intro-floating-note" aria-hidden="true">
        소중한 소식이
        <br />
        전달되었습니다.
      </p>
    </div>
  );
}

export function IntroCanonicalBoard() {
  return (
    <div className="intro-canonical-page">
      <header className="intro-site-header" aria-label="PING 소개 페이지 메뉴">
        <Link href="/" className="intro-header-brand" aria-label="PING 홈">
          <PingBrandLogo variant="horizontal" className="intro-header-logo" />
          <span>모바일 부고 발송 플랫폼</span>
        </Link>
        <nav className="intro-header-nav" aria-label="주요 메뉴">
          {NAV.map((item) => (
            <Link key={item.label} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="intro-header-actions">
          <Link href={LOGIN_HREF} className="intro-login-link">
            로그인
          </Link>
          <LandingStartLink href={START_HREF} className="intro-header-cta" onClick={onStartClick}>
            부고 보내기
            <ArrowRight size={20} strokeWidth={1.9} aria-hidden="true" />
          </LandingStartLink>
        </div>
      </header>

      <main className="intro-board" id="intro-hero">
        <div className="intro-background-shape" aria-hidden="true" />
        <section className="intro-hero-copy" aria-labelledby="intro-canonical-title">
          <p className="intro-eyebrow">
            <b>PING</b>
            <span>CONNECT · SHARE · GO FURTHER</span>
          </p>
          <h1 id="intro-canonical-title">
            <span>한 사람씩 보내던</span>
            <span>부고 연락을,</span>
            <strong>한 번에.</strong>
          </h1>
          <p className="intro-description">
            부고 정보를 불러오고, 연락처를 선택해
            <br />
            필요한 분들께 한 번에 전달하세요.
            <br />
            복잡한 과정 없이, PING이 함께합니다.
          </p>
          <LandingStartLink href={START_HREF} className="intro-primary-cta" onClick={onStartClick}>
            <span className="intro-cta-play" aria-hidden="true">
              <Play size={21} fill="currentColor" strokeWidth={0} />
            </span>
            <span>바로 시작하기</span>
            <ArrowRight className="intro-cta-arrow" size={27} strokeWidth={1.8} aria-hidden="true" />
          </LandingStartLink>
          <div className="intro-mini-points" aria-label="PING 서비스 장점">
            <span>
              <ShieldCheck size={22} strokeWidth={1.9} /> 개인정보 안전 보호
            </span>
            <span>
              <Users size={22} strokeWidth={1.9} /> 회원가입 없이도 간편하게
            </span>
            <span>
              <CheckCircle2 size={22} strokeWidth={1.9} /> 3분이면 충분합니다
            </span>
          </div>
          <p className="intro-emotional-copy">
            <span>마음이 닿는 거리는</span>
            <span>더 멀어집니다.</span>
            <b>PING</b>
          </p>
        </section>

        <ContactPhone />

        <aside className="intro-steps" id="intro-how" aria-label="PING 이용 방법">
          <ol>
            {STEPS.map((step, index) => (
              <li key={step.title} className={index === 0 ? "is-active" : undefined}>
                <span className="intro-step-number">{index + 1}</span>
                <span className="intro-step-icon">
                  <step.Icon size={29} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="intro-step-copy">
                  <strong>{step.title}</strong>
                  <span>
                    {step.lines[0]}
                    <br />
                    {step.lines[1]}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <p className="intro-steps-tagline">
            <span />
            REAL CONNECTIONS
            <br />
            BRIGHTER TOMORROWS
            <span />
          </p>
        </aside>
      </main>

      <section className="intro-trust-strip" aria-label="PING이 지키는 가치">
        {TRUST.map((item) => (
          <article key={item.title} className="intro-trust-item">
            <span className="intro-trust-icon">{item.icon({ size: 42, strokeWidth: 1.8 })}</span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.desc}</small>
            </span>
          </article>
        ))}
      </section>
    </div>
  );
}
