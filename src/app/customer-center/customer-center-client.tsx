"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  type PingStoredCustomerInquiry,
  PING_CUSTOMER_INQUIRIES_KEY,
} from "@/lib/ping-customer-inquiries";
import { cn } from "@/lib/utils";

const TECH_SUPPORT_EMAIL = "kaibcmac@gmail.com";

export function CustomerCenterClient() {
  const [generalOpen, setGeneralOpen] = useState(false);
  const [techOpen, setTechOpen] = useState(false);

  const onGeneralSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") || "");
    if (password.length < 4) {
      window.alert("비밀번호는 4자 이상 입력해주세요.");
      return;
    }
    const inquiry: PingStoredCustomerInquiry = {
      id: Date.now().toString(),
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || ""),
      inquiryType: String(fd.get("inquiryType") || ""),
      title: String(fd.get("title") || ""),
      content: String(fd.get("content") || ""),
      password,
      status: "대기중",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      const raw = localStorage.getItem(PING_CUSTOMER_INQUIRIES_KEY);
      const list = raw ? (JSON.parse(raw) as PingStoredCustomerInquiry[]) : [];
      list.push(inquiry);
      localStorage.setItem(PING_CUSTOMER_INQUIRIES_KEY, JSON.stringify(list));
    } catch {
      window.alert("저장에 실패했습니다. 다시 시도해 주세요.");
      return;
    }
    e.currentTarget.reset();
    setGeneralOpen(false);
    window.alert("문의가 접수되었습니다. 문의 게시판에서 확인하실 수 있습니다.");
    if (window.confirm("문의 게시판으로 이동하시겠습니까?")) {
      window.location.href = "/inquiry-board";
    }
  }, []);

  const onTechSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "");
    const email = String(fd.get("email") || "");
    const language = String(fd.get("language") || "");
    const integrationId = String(fd.get("integrationId") || "");
    const errorCode = String(fd.get("errorCode") || "");
    const description = String(fd.get("description") || "");
    const subject = encodeURIComponent(`[기술지원 문의] ${name}님의 문의`);
    const body = encodeURIComponent(
      [
        `이름: ${name}`,
        `이메일: ${email}`,
        `사용 언어: ${language}`,
        `연동 중인 ID: ${integrationId || "없음"}`,
        `오류 코드: ${errorCode || "없음"}`,
        "",
        "증상 및 상세 내용:",
        description,
      ].join("\n"),
    );
    window.location.href = `mailto:${TECH_SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    e.currentTarget.reset();
    setTechOpen(false);
    window.alert("이메일 클라이언트가 열렸습니다. 이메일을 확인하고 전송해주세요.");
  }, []);

  return (
    <div className="min-h-dvh bg-[#f9fafb] font-ping text-[#191f28] antialiased">
      <header className="sticky top-0 z-20 border-b border-[#e5e8eb] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[900px] items-center justify-between gap-4 px-6">
          <Link href="/products/ping" className="inline-flex items-center gap-2" aria-label="PING 홈">
            <img src="/ping_logo_svg.svg" alt="PING" className="h-7 w-auto" />
          </Link>
          <nav className="flex items-center gap-4 text-sm font-semibold text-[#6b7684]">
            <Link href="/products/ping" className="hover:text-[var(--ping-primary)]">
              소개
            </Link>
            <Link href="/start?skipIntro=1" className="hover:text-[var(--ping-primary)]">
              발송하기
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="px-6 pb-12 pt-12 text-center md:pb-16 md:pt-20">
          <div className="mx-auto max-w-[900px]">
            <span className="mb-6 inline-block rounded-full bg-[rgba(49,130,246,0.12)] px-4 py-2 text-sm font-semibold text-[var(--ping-primary)]">
              고객센터
            </span>
            <h1 className="mb-4 text-[2rem] font-extrabold leading-tight tracking-tight md:text-5xl">
              도움이 필요하신가요?
            </h1>
            <p className="mx-auto max-w-xl text-base leading-relaxed text-[#6b7684] md:text-lg">
              궁금한 점이 있으시면 언제든지 문의해주세요. 빠르고 친절하게 도와드리겠습니다.
            </p>
          </div>
        </section>

        <section className="px-6 pb-10">
          <div className="mx-auto max-w-[900px]">
            <div className="rounded-2xl border border-[#e5e8eb] bg-white p-6 shadow-sm md:p-12">
              <h2 className="mb-2 text-xl font-bold md:text-2xl">서비스 이용에 대해 궁금한 점이 있으신가요?</h2>
              <p className="mb-6 text-[15px] leading-relaxed text-[#6b7684]">
                결제, 환불, 사용법 등 일반적인 문의는 1:1 문의를 이용해 주세요. 가장 빠르게 답변을 받으실 수 있습니다.
              </p>

              <div className="mb-6 rounded-xl bg-[#f2f4f6] p-5 text-[15px] text-[#4e5968]">
                <p className="mb-2">
                  <strong className="text-[#191f28]">운영 시간:</strong> 평일 09:00 ~ 18:00
                </p>
                <p className="mb-0">
                  <strong className="text-[#191f28]">주요 문의:</strong> 이용 요금, 결제/환불, 발송 내역 조회, 부가서비스 신청
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setGeneralOpen((v) => !v)}
                  className="inline-flex items-center justify-center rounded-xl bg-[var(--ping-primary)] px-6 py-3.5 text-base font-semibold text-white transition hover:opacity-95"
                >
                  1:1 문의하기
                </button>
                <a
                  href="/inquiry-board"
                  className="inline-flex items-center justify-center rounded-xl bg-[var(--ping-primary)] px-6 py-3.5 text-base font-semibold text-white no-underline transition hover:opacity-95"
                >
                  문의 게시판 보기
                </a>
              </div>

              <form
                id="generalInquiryForm"
                onSubmit={onGeneralSubmit}
                className={cn("mt-6 space-y-5 border-t border-[#e5e8eb] pt-6", !generalOpen && "hidden")}
              >
                <Field label="이름" required>
                  <input name="name" required className={inputClass} />
                </Field>
                <Field label="이메일" required>
                  <input name="email" type="email" required className={inputClass} />
                </Field>
                <Field label="연락처" required>
                  <input name="phone" type="tel" required placeholder="010-1234-5678" className={inputClass} />
                </Field>
                <Field label="문의 유형" required>
                  <select name="inquiryType" required className={inputClass} defaultValue="">
                    <option value="">선택해주세요</option>
                    <option value="payment">결제/환불</option>
                    <option value="usage">사용법</option>
                    <option value="service">부가서비스</option>
                    <option value="history">발송 내역 조회</option>
                    <option value="other">기타</option>
                  </select>
                </Field>
                <Field label="문의 제목" required>
                  <input name="title" required placeholder="문의 제목을 입력해주세요" className={inputClass} />
                </Field>
                <Field label="문의 내용" required>
                  <textarea name="content" required rows={5} placeholder="문의 내용을 상세히 입력해주세요." className={textareaClass} />
                </Field>
                <Field label="비밀번호" required hint="문의 조회 시 사용할 비밀번호를 입력해주세요.">
                  <input
                    name="password"
                    type="password"
                    required
                    placeholder="문의 조회용 비밀번호 (4자 이상)"
                    className={inputClass}
                  />
                </Field>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-[var(--ping-primary)] py-3.5 text-base font-semibold text-white"
                  >
                    문의 제출하기
                  </button>
                  <button
                    type="button"
                    onClick={() => setGeneralOpen(false)}
                    className="flex-1 rounded-xl bg-[#e5e8eb] py-3.5 text-base font-semibold text-[#4e5968]"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>

        <section id="tech-inquiry" className="px-6 pb-16">
          <div className="mx-auto max-w-[900px]">
            <div className="rounded-2xl border border-[#e5e8eb] bg-white p-6 shadow-sm md:p-12">
              <h2 className="mb-2 text-xl font-bold md:text-2xl">API 연동 및 개발 관련 도움이 필요하신가요?</h2>
              <p className="mb-6 text-[15px] leading-relaxed text-[#6b7684]">
                개발 중 발생하는 오류나 기술적인 문제는 전문 개발팀이 직접 확인합니다. 정확한 확인을 위해 이메일로 상세 내용을 남겨주세요.
              </p>
              <div className="mb-6 rounded-xl bg-[#f2f4f6] p-5 text-[15px] text-[#4e5968]">
                <p className="mb-2">
                  <strong className="text-[#191f28]">필수 기재 사항:</strong> 사용 언어(PHP, Java 등), 연동 중인 ID, 오류 코드, 증상 캡처
                </p>
                <p className="mb-0">
                  <strong className="text-[#191f28]">처리 절차:</strong> 접수 → 개발팀 로그 분석 → 원인 파악 및 회신 (최대 24시간 소요)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTechOpen((v) => !v)}
                className="inline-flex items-center justify-center rounded-xl bg-[var(--ping-primary)] px-6 py-3.5 text-base font-semibold text-white"
              >
                기술지원 문의 작성하기
              </button>

              <form
                id="techInquiryForm"
                onSubmit={onTechSubmit}
                className={cn("mt-6 space-y-5 border-t border-[#e5e8eb] pt-6", !techOpen && "hidden")}
              >
                <Field label="이름" required>
                  <input name="name" required className={inputClass} />
                </Field>
                <Field label="이메일" required hint="답변을 받을 이메일 주소를 입력해주세요.">
                  <input name="email" type="email" required className={inputClass} />
                </Field>
                <Field label="사용 언어" required>
                  <select name="language" required className={inputClass} defaultValue="">
                    <option value="">선택해주세요</option>
                    <option value="PHP">PHP</option>
                    <option value="Java">Java</option>
                    <option value="Python">Python</option>
                    <option value="Node.js">Node.js</option>
                    <option value="기타">기타</option>
                  </select>
                </Field>
                <Field label="연동 중인 ID">
                  <input name="integrationId" placeholder="예: user123" className={inputClass} />
                </Field>
                <Field label="오류 코드">
                  <input name="errorCode" placeholder="예: ERR_001" className={inputClass} />
                </Field>
                <Field label="증상 및 상세 내용" required hint="증상 캡처 이미지가 있으면 이메일로 별도 첨부해주세요.">
                  <textarea name="description" required rows={6} className={textareaClass} placeholder="발생한 문제에 대해 상세히 설명해주세요." />
                </Field>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-[var(--ping-primary)] py-3.5 text-base font-semibold text-white"
                  >
                    문의 제출하기
                  </button>
                  <button
                    type="button"
                    onClick={() => setTechOpen(false)}
                    className="flex-1 rounded-xl bg-[#e5e8eb] py-3.5 text-base font-semibold text-[#4e5968]"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e5e8eb] bg-white py-8">
        <div className="mx-auto flex max-w-[900px] flex-col gap-4 px-6 text-sm text-[#6b7684] md:flex-row md:items-center md:justify-between">
          <span className="font-semibold text-[#191f28]">한국AIBC융합원 · PING</span>
          <nav className="flex flex-wrap gap-x-4 gap-y-2">
            <a href="/legal/terms-of-service?pingReturn=customer-center" className="hover:text-[var(--ping-primary)]">
              이용약관
            </a>
            <a href="/legal/privacy-policy?pingReturn=customer-center" className="hover:text-[var(--ping-primary)]">
              개인정보처리방침
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-[#d1d6db] px-4 py-3 text-[15px] outline-none transition focus-visible:border-[var(--ping-primary)] focus-visible:ring-2 focus-visible:ring-[rgba(49,130,246,0.2)]";

const textareaClass =
  "w-full min-h-[120px] resize-y rounded-lg border border-[#d1d6db] px-4 py-3 text-[15px] outline-none transition focus-visible:border-[var(--ping-primary)] focus-visible:ring-2 focus-visible:ring-[rgba(49,130,246,0.2)]";

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[#191f28]">
        {label}{" "}
        {required ? <span className="text-red-500">*</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-[13px] text-[#8b95a1]">{hint}</p> : null}
    </div>
  );
}
