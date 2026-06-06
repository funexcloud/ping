"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

const MAIL = "kaibcmac@gmail.com";

type PartnershipType = "funeral" | "director" | "other";

function typeLabel(t: PartnershipType): string {
  if (t === "funeral") return "장례식장";
  if (t === "director") return "장례지도사";
  return "기타";
}

function openMailto(data: {
  partnershipType: PartnershipType;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  inquiry: string;
}) {
  const subject = encodeURIComponent(
    `[PING 제휴문의] ${data.companyName} - ${typeLabel(data.partnershipType)}`,
  );
  const body = encodeURIComponent(
    [
      `제휴 유형: ${typeLabel(data.partnershipType)}`,
      `회사/기관명: ${data.companyName}`,
      `담당자명: ${data.contactName}`,
      `연락처: ${data.phone}`,
      `이메일: ${data.email}`,
      "",
      "문의 내용:",
      data.inquiry,
    ].join("\n"),
  );
  window.location.href = `mailto:${MAIL}?subject=${subject}&body=${body}`;
}

export function PartnershipPageClient() {
  const [showSuccess, setShowSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  const onSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const partnershipType = String(fd.get("partnershipType") || "other") as PartnershipType;
    const data = {
      partnershipType,
      companyName: String(fd.get("companyName") || ""),
      contactName: String(fd.get("contactName") || ""),
      phone: String(fd.get("phone") || ""),
      email: String(fd.get("email") || ""),
      inquiry: String(fd.get("inquiry") || ""),
      submittedAt: new Date().toISOString(),
    };

    let savedOnServer = false;
    try {
      const leadPayload = {
        source: "partnership",
        partnershipType: data.partnershipType,
        companyName: data.companyName,
        contactName: data.contactName,
        phone: data.phone,
        email: data.email,
        inquiry: data.inquiry,
        page: typeof window !== "undefined" ? window.location.pathname || "/partnership" : "/partnership",
        utm: {} as Record<string, string>,
        visitorId: "",
        marketingCookies: {} as Record<string, string>,
      };
      const leadRes = await fetch("/api/leads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadPayload),
      });
      savedOnServer = leadRes.ok;
    } catch {
      savedOnServer = false;
    }

    try {
      if (!savedOnServer) openMailto(data);
      form.reset();
      setShowSuccess(true);
      window.setTimeout(() => {
        const el = document.getElementById("partnership-success");
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
      window.setTimeout(() => setShowSuccess(false), 5000);
    } catch {
      window.alert("문의 전송 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setPending(false);
    }
  }, []);

  return (
    <div className="min-h-dvh bg-ping-bg font-ping text-[#191f28] antialiased">
      <header className="sticky top-0 z-20 border-b border-[#e5e8eb] bg-white/80 backdrop-blur-[10px]">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-8 px-6 py-4">
          <Link href="/products/ping" className="inline-flex items-center gap-2" aria-label="PING 홈">
            <img src="/ping_logo_svg.svg" alt="PING" className="h-10 w-auto max-w-[200px] object-contain" />
          </Link>
          <div className="flex items-center gap-8">
            <Link
              href="/start?skipIntro=1"
              className="rounded-lg bg-[var(--ping-primary)] px-5 py-2.5 text-[15px] font-semibold text-white no-underline transition hover:opacity-95"
            >
              신청하기
            </Link>
            <nav className="hidden items-center gap-8 md:flex">
              <Link href="/products/ping#features" className="text-[15px] font-medium text-[#4e5968] hover:text-[var(--ping-primary)]">
                기능
              </Link>
              <Link href="/products/ping#how-it-works" className="text-[15px] font-medium text-[#4e5968] hover:text-[var(--ping-primary)]">
                사용방법
              </Link>
              <Link href="/products/ping#pricing" className="text-[15px] font-medium text-[#4e5968] hover:text-[var(--ping-primary)]">
                가격
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <section className="px-6 pb-14 pt-16 text-center md:pb-16 md:pt-20">
        <div className="mx-auto max-w-[800px]">
          <span className="mb-6 inline-block rounded-full bg-[rgba(49,130,246,0.12)] px-4 py-2 text-sm font-semibold text-[var(--ping-primary)]">
            파트너십
          </span>
          <h1 className="mb-4 text-[2rem] font-extrabold leading-tight tracking-tight md:text-5xl">제휴문의</h1>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-[#6b7684] md:text-lg">
            PING과 함께 장례 커뮤니케이션 경험을 확장하세요. 장례식장, 장례지도사 등 다양한 파트너십을 기다리고 있습니다.
          </p>
        </div>
      </section>

      <section className="px-6 pb-20 md:pb-28">
        <div className="mx-auto max-w-[800px]">
          <div
            id="partnership-success"
            role="status"
            className={cn(
              "mb-6 rounded-xl border border-[var(--ping-primary)] bg-[rgba(49,130,246,0.12)] px-6 py-6 text-center transition-opacity",
              showSuccess ? "block opacity-100" : "hidden opacity-0",
            )}
          >
            <h3 className="mb-2 text-xl font-bold text-[var(--ping-primary)]">문의가 접수되었습니다</h3>
            <p className="text-base text-[#4e5968]">빠른 시일 내에 담당자가 연락드리겠습니다.</p>
          </div>

          <div className="rounded-3xl border border-[#e5e8eb] bg-white p-8 shadow-[0_4px_12px_rgba(0,0,0,0.05)] md:p-12">
            <form onSubmit={onSubmit} className="space-y-8">
              <div>
                <p className="mb-3 text-base font-semibold text-[#191f28]">
                  제휴 유형 <span className="ml-1 text-[var(--ping-primary)]">*</span>
                </p>
                <div className="flex flex-col gap-3">
                  {(
                    [
                      ["funeral", "장례식장"],
                      ["director", "장례지도사"],
                      ["other", "기타"],
                    ] as const
                  ).map(([value, label]) => (
                    <label key={value} className="flex cursor-pointer items-center gap-2 text-base text-[#4e5968]">
                      <input
                        type="radio"
                        name="partnershipType"
                        value={value}
                        required
                        className="size-5 accent-[var(--ping-primary)]"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <Field label="회사/기관명" required>
                <input name="companyName" required placeholder="예: 서울장례식장" className={inputCls} />
              </Field>
              <Field label="담당자명" required>
                <input name="contactName" required placeholder="예: 홍길동" className={inputCls} />
              </Field>
              <Field label="연락처" required hint="연락 가능한 전화번호를 입력해주세요.">
                <input name="phone" type="tel" required placeholder="010-1234-5678" className={inputCls} />
              </Field>
              <Field label="이메일" required>
                <input name="email" type="email" required placeholder="example@email.com" className={inputCls} />
              </Field>
              <Field label="문의 내용" required>
                <textarea
                  name="inquiry"
                  required
                  rows={5}
                  placeholder="제휴에 대한 문의사항을 자세히 적어주세요."
                  className={cn(inputCls, "min-h-[120px] resize-y")}
                />
              </Field>

              <button
                type="submit"
                disabled={pending}
                className="mt-2 w-full rounded-xl border-none bg-[var(--ping-primary)] py-[18px] text-[17px] font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:bg-[#d1d6db]"
              >
                {pending ? "전송 중..." : "문의하기"}
              </button>
            </form>
          </div>
        </div>
      </section>

      <footer className="mt-16 bg-[#191f28] px-6 py-16 text-white md:mt-28">
        <div className="mx-auto grid max-w-[1200px] gap-12 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <h3 className="mb-4 text-base font-bold">서비스</h3>
            <Link href="/products/ping" className="mb-3 block text-sm text-[#b0b8c1] hover:text-white">
              서비스 소개
            </Link>
            <Link href="/start?skipIntro=1" className="mb-3 block text-sm text-[#b0b8c1] hover:text-white">
              발송 신청
            </Link>
            <Link href="/customer-center" className="block text-sm text-[#b0b8c1] hover:text-white">
              고객센터
            </Link>
          </div>
          <div>
            <h3 className="mb-4 text-base font-bold">정책</h3>
            <a href="/legal/terms-of-service?pingReturn=partnership" className="mb-3 block text-sm text-[#b0b8c1] hover:text-white">
              이용약관
            </a>
            <a href="/legal/privacy-policy?pingReturn=partnership" className="block text-sm text-[#b0b8c1] hover:text-white">
              개인정보처리방침
            </a>
          </div>
          <div className="text-sm leading-relaxed text-[#b0b8c1] sm:col-span-2 md:col-span-1">
            <strong className="text-white">한국AIBC융합원</strong>
            <br />
            부고 커뮤니케이션 서비스 PING
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-[1200px] border-t border-white/10 pt-8 text-sm text-[#b0b8c1]">
          © PING. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[#d1d6db] bg-white px-4 py-3.5 text-base text-[#191f28] outline-none transition focus-visible:border-[var(--ping-primary)] focus-visible:ring-[3px] focus-visible:ring-[rgba(49,130,246,0.15)]";

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
      <label className="mb-3 block text-base font-semibold text-[#191f28]">
        {label}{" "}
        {required ? <span className="text-[var(--ping-primary)]">*</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-2 text-sm text-[#8b95a1]">{hint}</p> : null}
    </div>
  );
}
