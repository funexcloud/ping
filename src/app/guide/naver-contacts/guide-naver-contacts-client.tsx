"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { Lightbulb, LogIn, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = {
  n: number;
  nStyle?: "emerald";
  img: string;
  imgAlt: string;
  label: string;
  labelStyle?: "emerald";
  title: string;
  frame?: boolean;
  desc: ReactNode;
};

const STEPS: Step[] = [
  {
    n: 1,
    img: "/assets/guide/step1-naver-install.png",
    imgAlt: "네이버 앱 설치",
    label: "STEP 1",
    title: "네이버 앱 설치",
    desc: (
      <>
        App Store(아이폰) 또는 Play Store(안드로이드)에서 <strong className="text-[#191f28]">네이버</strong> 앱을 검색하여
        설치합니다. 이미 설치되어 있다면 최신 버전으로 업데이트해 주세요.
      </>
    ),
  },
  {
    n: 2,
    img: "/assets/guide/step2-naver-contacts.png",
    imgAlt: "햄버거 메뉴 → 내 도구 → 주소록",
    label: "STEP 2",
    title: "왼쪽 메뉴(≡) → 내 도구 → 주소록",
    desc: (
      <>
        네이버 앱을 열고, <strong className="text-[#191f28]">좌측 상단 ☰ 햄버거 메뉴</strong>를 탭합니다. 메뉴를 아래로
        스크롤하면 <strong className="text-[#191f28]">&quot;내 도구&quot;</strong> 영역이 나타납니다. 그 안에서{" "}
        <strong className="text-[#191f28]">&quot;주소록&quot;</strong>을 선택하여 진입하세요.
      </>
    ),
  },
  {
    n: 3,
    img: "/assets/guide/step3-hamburger-menu.png",
    imgAlt: "햄버거 메뉴",
    label: "STEP 3",
    title: "햄버거 메뉴(≡) 열기",
    desc: (
      <>
        주소록 화면에 진입한 뒤, 우측 상단 또는 하단에 있는{" "}
        <strong className="text-[#191f28]">☰ 메뉴 아이콘(가로줄 3개)</strong>을 탭합니다. 연락처 관리 옵션이
        나타납니다.
      </>
    ),
  },
  {
    n: 4,
    img: "/assets/guide/step4-upload-contacts.png",
    imgAlt: "폰 연락처 업로드",
    label: "STEP 4",
    title: "&quot;폰 연락처 업로드&quot; 실행",
    desc: (
      <>
        메뉴 목록에서 <strong className="text-[#191f28]">&quot;폰 연락처 업로드&quot;</strong>를 선택합니다. 폰에 저장된
        모든 연락처가 네이버 클라우드(주소록)에 동기화됩니다. 처음 한 번만 실행하면 됩니다.
      </>
    ),
  },
  {
    n: 5,
    nStyle: "emerald",
    img: "/assets/guide/step5-download-contacts.png",
    imgAlt: "폰 연락처 다운로드",
    label: "STEP 5 — 완료!",
    labelStyle: "emerald",
    title: "&quot;폰 연락처 다운로드&quot;로 파일 저장",
    frame: true,
    desc: (
      <>
        같은 메뉴에서 <strong className="text-[#191f28]">&quot;폰 연락처 다운로드&quot;</strong>를 선택합니다. 연락처가{" "}
        <strong className="text-[#191f28]">.vcf 파일</strong>로 폰에 저장됩니다. 이 파일을 Ping 대량발송 화면에서
        업로드하면 연락처 명단이 자동으로 인식됩니다.
      </>
    ),
  },
];

export function GuideNaverContactsClient() {
  const [modal, setModal] = useState<{ src: string; alt: string } | null>(null);

  const openModal = useCallback((src: string, alt: string) => {
    setModal({ src, alt });
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [modal, closeModal]);

  return (
    <div className="min-h-dvh bg-[var(--ping-bg,#f5f7fb)] font-ping text-[#191f28] antialiased [--ping-surface:#ffffff]">
      <div className="mx-auto min-h-dvh max-w-[480px] shadow-[0_4px_24px_rgba(15,23,42,0.08)] sm:my-3 sm:min-h-0 sm:overflow-hidden sm:rounded-[24px]">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#1a2332] via-[#0c1016] to-[#152030] px-6 pb-10 pt-14 text-[#f8fafc] after:pointer-events-none after:absolute after:-right-[30%] after:-top-[40%] after:size-[300px] after:rounded-full after:bg-[radial-gradient(circle,rgba(49,130,246,0.12)_0%,transparent_70%)]">
          <Link
            href="/"
            className="mb-5 inline-flex items-center gap-1 text-[13px] font-semibold text-white/55 transition hover:text-white/85"
          >
            ← 홈으로 돌아가기
          </Link>
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.28em] text-white/45">HOW-TO GUIDE</p>
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[rgba(49,130,246,0.18)] px-3 py-1.5 text-[11px] font-bold tracking-wide text-[#93C5FD]">
            <LogIn className="size-3.5" aria-hidden />
            5단계 · 약 3분 소요
          </div>
          <h1 className="relative z-[1] text-[22px] font-extrabold leading-snug tracking-tight">
            네이버 주소록으로
            <br />
            폰 연락처 가져오기
          </h1>
          <p className="relative z-[1] mt-3 text-[13px] font-medium leading-relaxed text-white/60">
            네이버 앱의 주소록 기능을 활용하면 폰에 저장된 연락처를
            <br />
            파일로 내보내 Ping에서 바로 활용할 수 있습니다.
          </p>
        </div>

        <div className="relative z-[2] -mt-4 flex flex-col gap-4 px-4 pb-6">
          {STEPS.map((step, i) => (
            <div key={step.n}>
              <article
                id={`step-${step.n}`}
                className={cn(
                  "animate-in fade-in slide-in-from-bottom-5 fill-mode-forwards overflow-hidden rounded-[20px] bg-[var(--ping-surface)] shadow-[0_4px_20px_rgba(15,23,42,0.08)] duration-500",
                  step.frame && "border-2 border-[rgba(49,130,246,0.25)]",
                )}
                style={{ animationDelay: `${(i + 1) * 100}ms` }}
              >
                <button
                  type="button"
                  className="relative block w-full cursor-zoom-in border-0 bg-[var(--ping-bg,#f2f4f6)] p-0 text-left"
                  onClick={() => openModal(step.img, step.imgAlt)}
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <span
                      className={cn(
                        "absolute left-3 top-3 z-[2] flex size-8 items-center justify-center rounded-full text-sm font-extrabold text-white shadow-[0_2px_8px_rgba(49,130,246,0.35)]",
                        step.nStyle === "emerald" ? "bg-emerald-500" : "bg-[var(--ping-primary)]",
                      )}
                    >
                      {step.n}
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element -- public /assets 가이드 스크린샷 */}
                    <img
                      src={step.img}
                      alt={step.imgAlt}
                      loading="lazy"
                      className="size-full object-cover transition duration-300 group-hover:scale-[1.03] hover:scale-[1.03]"
                    />
                  </div>
                </button>
                <div className="px-5 pb-5 pt-4">
                  <p
                    className={cn(
                      "mb-1.5 text-[11px] font-bold tracking-wider",
                      step.labelStyle === "emerald" ? "text-emerald-600" : "text-[var(--ping-primary)]",
                    )}
                  >
                    {step.label}
                  </p>
                  <h2 className="mb-2 text-base font-extrabold leading-snug tracking-tight text-[#191f28]">
                    {step.title}
                  </h2>
                  <p className="text-[13px] leading-relaxed text-[#6b7684] [word-break:keep-all]">{step.desc}</p>
                </div>
              </article>
              {i < STEPS.length - 1 ? (
                <div className="flex justify-center py-1">
                  <div className="h-5 w-0.5 rounded-full bg-gradient-to-b from-[var(--ping-primary)] to-[rgba(49,130,246,0.15)]" />
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mx-4 mb-4 flex gap-3 rounded-2xl bg-[rgba(49,130,246,0.06)] px-[18px] py-[18px]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--ping-primary)] text-white">
            <Lightbulb className="size-4" aria-hidden />
          </div>
          <p className="text-[12.5px] leading-relaxed text-[#6b7684] [word-break:keep-all]">
            <strong className="text-[var(--ping-primary)]">다운로드된 .vcf 파일은 어디에 있나요?</strong>
            <br />
            아이폰: &quot;파일&quot; 앱 → 다운로드 폴더
            <br />
            안드로이드: &quot;내 파일&quot; 앱 → Download 폴더
            <br />
            Ping 발송 화면에서 &quot;파일 선택&quot; 시 해당 폴더를 확인해 주세요.
          </p>
        </div>

        <div className="mx-4 mb-4 flex gap-3 rounded-2xl bg-amber-50 px-[18px] py-4">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-extrabold text-white">
            !
          </div>
          <p className="text-[12.5px] leading-relaxed text-amber-900 [word-break:keep-all]">
            네이버 주소록 업로드/다운로드 기능을 사용하려면{" "}
            <strong className="text-amber-950">네이버 로그인</strong>이 필요합니다. 아직 네이버 계정이 없는 경우 먼저
            회원가입을 진행해 주세요.
          </p>
        </div>

        <div className="px-4 pb-8 pt-4 text-center">
          <p className="mb-4 text-[13px] leading-relaxed text-[#8b95a1]">
            연락처 파일이 준비되셨나요?
            <br />
            지금 바로 Ping에서 부고 문자를 발송하세요.
          </p>
          <Link
            href="/"
            className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ping-primary)] px-4 text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(49,130,246,0.25)] transition active:scale-[0.99] active:opacity-[0.92]"
          >
            <Send className="size-[18px]" aria-hidden />
            Ping 발송 화면으로 이동
          </Link>
        </div>

        <footer className="px-4 pb-8 text-center text-[11px] leading-relaxed text-[#8b95a1]">
          © Ping by FunexCloud ·{" "}
          <a href="/legal/privacy-policy" className="text-[var(--ping-primary)] no-underline hover:underline">
            개인정보처리방침
          </a>
        </footer>
      </div>

      {modal ? (
        <div
          className="fixed inset-0 z-[9999] flex cursor-zoom-out items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="이미지 확대"
          onClick={closeModal}
        >
          <button
            type="button"
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/15 text-xl text-white"
            onClick={(e) => {
              e.stopPropagation();
              closeModal();
            }}
            aria-label="닫기"
          >
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={modal.src}
            alt={modal.alt}
            className="max-h-[85vh] max-w-[92vw] rounded-xl object-contain shadow-[0_8px_40px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
