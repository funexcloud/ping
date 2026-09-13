"use client";

import {
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  Heart,
  LockKeyhole,
  Menu,
  Play,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { PingBrandLogo } from "@/components/brand/ping-brand-logo";
import { PhoneMockup } from "@/components/ping-mobile/phone-mockup";
import { pingTrack } from "@/lib/ping-analytics";

const START_PATH = "/start?skipIntro=1";

const steps = [
  { title: "부고 정보 불러오기", lines: ["부고 링크 또는 내용을", "불러옵니다."], icon: Smartphone },
  { title: "연락처 가져오기", lines: ["휴대폰 연락처를", "한 번에 불러옵니다."], icon: UserRound },
  { title: "발송 대상 선택", lines: ["가족, 친척, 지인 등", "필요한 분들을 선택합니다."], icon: UsersRound },
  { title: "발송 준비 및 결제", lines: ["내용을 확인하고", "발송을 준비합니다."], icon: CreditCard },
  { title: "발송 완료", lines: ["소중한 분들에게", "부고가 전달되었습니다."], icon: Send },
] as const;

const contacts = [
  { name: "김영수", phone: "010-1234-****", selected: true, tone: "warm" },
  { name: "이서연", phone: "010-2345-****", selected: true, tone: "rose" },
  { name: "박민수", phone: "010-3456-****", selected: false, tone: "sand" },
  { name: "정하은", phone: "010-4567-****", selected: false, tone: "gray", initial: "정" },
  { name: "최도윤", phone: "010-5678-****", selected: false, tone: "blue" },
  { name: "한예진", phone: "010-6789-****", selected: false, tone: "gray", initial: "한" },
] as const;

const trustItems: Array<{
  title: string;
  detail: string;
  icon: (props: { size?: number; strokeWidth?: number }) => ReactNode;
}> = [
  { title: "정확한 발송", detail: "중복 없이, 빠르고 정확하게", icon: (props) => <Send {...props} /> },
  { title: "개인정보 보호", detail: "연락처 전체를 저장하지 않습니다", icon: (props) => <LockKeyhole {...props} /> },
  { title: "간편한 사용", detail: "누구나 쉽게 3분이면 충분합니다", icon: (props) => <UsersRound {...props} /> },
  { title: "따뜻한 마음", detail: "소중한 인연을 잇는 마음으로", icon: (props) => <Heart {...props} /> },
];

function rememberIntroAndTrack(): void {
  try {
    sessionStorage.setItem("ping_intro_seen", "1");
  } catch {
    /* sessionStorage를 사용할 수 없어도 발송 시작은 계속 허용한다. */
  }
  pingTrack("start_click", { source: "intro_canonical" });
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
      <div className="intro-signal intro-signal--top" aria-hidden="true"><i /><i /><i /></div>
      <div className="intro-floating-app" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/ping/ping-app-logo-canonical.png" alt="" />
        <span>PING</span>
      </div>
      <div className="intro-signal intro-signal--bottom" aria-hidden="true"><i /><i /><i /></div>

      <PhoneMockup className="intro-phone-frame" showStatusBar={false}>
        <div className="intro-phone-screen">
          <div className="intro-phone-header">
            <PingBrandLogo variant="horizontal" className="intro-phone-logo" />
            <span className="intro-phone-progress"><b>1</b> / 6</span>
            <Menu size={25} strokeWidth={1.8} aria-hidden="true" />
          </div>
          <div className="intro-phone-content">
            <h2>연락처</h2>
            <p className="intro-phone-count">내 연락처 <strong>328명</strong></p>
            <div className="intro-phone-search" aria-hidden="true">
              <Search size={18} strokeWidth={2} /><span>이름 또는 전화번호 검색</span>
            </div>
            <ul className="intro-contact-list" aria-label="선택된 연락처 예시">
              {contacts.map((contact) => (
                <li key={contact.phone}>
                  <span className={`intro-contact-check${contact.selected ? " is-selected" : ""}`}>
                    {contact.selected ? <Check size={14} strokeWidth={3} /> : null}
                  </span>
                  <ContactAvatar tone={contact.tone} initial={"initial" in contact ? contact.initial : undefined} />
                  <span className="intro-contact-copy"><strong>{contact.name}</strong><small>{contact.phone}</small></span>
                </li>
              ))}
            </ul>
          </div>
          <div className="intro-phone-footer">연락처 가져오기</div>
        </div>
      </PhoneMockup>
      <p className="intro-floating-note" aria-hidden="true">소중한 소식이<br />전달되었습니다.</p>
    </div>
  );
}

export function IntroClient() {
  useEffect(() => {
    pingTrack("landing_view", { source: "intro_canonical" });
  }, []);

  return (
    <div className="intro-canonical-page">
      <header className="intro-site-header" aria-label="PING 소개 페이지 메뉴">
        <a className="intro-header-brand" href="#service-intro" aria-label="PING 서비스 소개로 이동">
          <PingBrandLogo variant="horizontal" className="intro-header-logo" />
          <span>모바일 부고 발송 플랫폼</span>
        </a>
        <nav className="intro-header-nav" aria-label="주요 메뉴">
          <a href="#service-intro">서비스 소개</a>
          <a href="#how-it-works">이용 방법</a>
          <a href="/obituary-create">부고장 템플릿</a>
          <a href="/pricing">요금안내</a>
          <a href="/customer-center">자주 묻는 질문</a>
        </nav>
        <div className="intro-header-actions">
          <a className="intro-login-link" href="/login">로그인</a>
          <a className="intro-header-cta" href={START_PATH} onClick={rememberIntroAndTrack}>
            부고 보내기 <ArrowRight size={20} strokeWidth={1.9} aria-hidden="true" />
          </a>
        </div>
      </header>

      <main className="intro-board" id="service-intro">
        <div className="intro-background-shape" aria-hidden="true" />
        <section className="intro-hero-copy" aria-labelledby="intro-title">
          <p className="intro-eyebrow"><b>PING</b><span>CONNECT · SHARE · GO FURTHER</span></p>
          <h1 id="intro-title"><span>한 사람씩 보내던</span><span>부고 연락을,</span><strong>한 번에.</strong></h1>
          <p className="intro-description">
            부고 정보를 불러오고, 연락처를 선택해<br />
            필요한 분들께 한 번에 전달하세요.<br />
            복잡한 과정 없이, PING이 함께합니다.
          </p>
          <a className="intro-primary-cta" href={START_PATH} onClick={rememberIntroAndTrack}>
            <span className="intro-cta-play"><Play size={21} fill="currentColor" strokeWidth={0} /></span>
            <span>바로 시작하기</span>
            <ArrowRight className="intro-cta-arrow" size={27} strokeWidth={1.8} aria-hidden="true" />
          </a>
          <div className="intro-mini-points" aria-label="PING 서비스 장점">
            <span><ShieldCheck size={22} strokeWidth={1.9} /> 개인정보 안전 보호</span>
            <span><UsersRound size={22} strokeWidth={1.9} /> 회원가입 없이도 간편하게</span>
            <span><CheckCircle2 size={22} strokeWidth={1.9} /> 3분이면 충분합니다</span>
          </div>
          <p className="intro-emotional-copy" aria-label="마음이 닿는 거리는 더 멀어집니다. PING">
            <span>마음이 닿는 거리는</span><span>더 멀어집니다.</span><b>PING</b>
          </p>
        </section>

        <ContactPhone />

        <section className="intro-steps" id="how-it-works" aria-label="PING 이용 방법">
          <ol>
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className={index === 0 ? "is-active" : ""}>
                  <span className="intro-step-number">{index + 1}</span>
                  <span className="intro-step-icon"><Icon size={29} strokeWidth={1.8} /></span>
                  <span className="intro-step-copy"><strong>{step.title}</strong><span>{step.lines[0]}<br />{step.lines[1]}</span></span>
                </li>
              );
            })}
          </ol>
          <p className="intro-steps-tagline"><span /> REAL CONNECTIONS<br />BRIGHTER TOMORROWS <span /></p>
        </section>
      </main>

      <section className="intro-trust-strip" aria-label="PING 핵심 가치">
        {trustItems.map((item) => (
          <div className="intro-trust-item" key={item.title}>
            <span className="intro-trust-icon">{item.icon({ size: 42, strokeWidth: 1.8 })}</span>
            <span><strong>{item.title}</strong><small>{item.detail}</small></span>
          </div>
        ))}
      </section>
    </div>
  );
}
