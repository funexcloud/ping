"use client";

import {
  CircleCheck,
  Clapperboard,
  FileText,
  MessageCircle,
  Send,
  Settings,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import "./obituary-create.css";

export default function ObituaryCreateClient() {
  const searchParams = useSearchParams();
  const [bannerOpen, setBannerOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("completed") !== "1") return;
    setBannerOpen(true);
    if (typeof window === "undefined") return;
    const path = window.location.pathname + window.location.hash;
    window.history.replaceState(null, "", path);
  }, [searchParams]);

  return (
    <div className="obituary-create-page flex min-h-dvh justify-center bg-background text-foreground">
      <div className="app-shell relative flex min-h-dvh w-full max-w-md flex-col bg-card">
        <header className="ping-sticky-page-header sticky top-0 z-20 flex shrink-0 items-center gap-3 border-b border-border/80 bg-card px-5 py-4">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="ping-back-btn touch-manipulation h-auto w-auto shrink-0 p-0 hover:bg-transparent focus-visible:ring-offset-0"
          >
            <Link href="/start" aria-label="뒤로">
              <span className="ping-chevron-left" aria-hidden="true" />
            </Link>
          </Button>
          <h1 className="flex-1 pr-11 text-center text-[15px] font-bold tracking-tight text-foreground">
            내 부고
          </h1>
        </header>

        <main className="flex-1 px-5 pb-12 pt-4">
          <div
            id="saveSuccessBanner"
            className={`mb-5 flex items-start gap-3 rounded-lg border border-dongban-mint/45 bg-dongban-cyan/[0.08] px-4 py-3 shadow-sm ${bannerOpen ? "" : "hidden"}`}
            role="status"
          >
            <CircleCheck
              className="mt-0.5 size-5 shrink-0 text-dongban-cyan"
              aria-hidden
              strokeWidth={2.25}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-foreground">저장되었습니다</p>
            </div>
            <Button
              type="button"
              id="saveSuccessBannerClose"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 touch-manipulation text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="닫기"
              onClick={() => setBannerOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>

          <p id="ob-cx-heading" className="mb-5 text-[14px] text-muted-foreground">
            새 부고를 만들거나 카드에서 이어가세요.
          </p>

          <Button
            asChild
            className="mb-7 h-auto w-full touch-manipulation rounded-lg bg-ping-primary px-5 py-4 text-[15px] font-bold text-white shadow-[0_12px_32px_rgba(0,151,169,0.28)] hover:bg-ping-primary/90 hover:opacity-[0.96] active:opacity-90"
          >
            <Link href="/obituary-form">새 부고 작성</Link>
          </Button>

          <article className="ob-dash-card mb-7" aria-label="진행 중인 부고">
            <div className="ob-dash-card__head">
              <div className="flex items-start justify-between gap-3">
                <span className="ob-dash-badge">종료</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ob-dash-delete touch-manipulation"
                  aria-label="삭제"
                >
                  <Trash2 className="size-[18px]" aria-hidden />
                </Button>
              </div>
              <h3 className="ob-dash-title">
                故 이말이{" "}
                <span className="ob-dash-title-meta">여 | 76세</span>
              </h3>
            </div>

            <div className="ob-dash-card__body space-y-2.5 text-[13px]">
              <div className="flex items-start gap-2">
                <span className="ob-dash-label">상주</span>
                <span className="ob-dash-value font-medium leading-snug">
                  서영환, 서희은, 서미은, 서재은, 서재환, 서민수, 서정아,
                  서하은, 서도윤
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="ob-dash-label">입실일자</span>
                <span className="ob-dash-value ob-dash-value--strong">
                  2026.02.18
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="ob-dash-label">장례식장</span>
                <span className="ob-dash-value font-medium leading-snug">
                  서울산국화원
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="ob-dash-label">호실</span>
                <span className="ob-dash-value ob-dash-value--strong">
                  특2호
                </span>
              </div>
            </div>

            <div
              className="ob-dash-actions"
              role="group"
              aria-label="부고 작업 메뉴"
            >
              <Button
                asChild
                variant="ghost"
                className="h-auto min-h-0 w-full rounded-none border-0 bg-transparent p-0 text-inherit shadow-none hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                <Link
                  href="/obituary/review"
                  className="ob-dash-act touch-manipulation"
                >
                  <FileText aria-hidden />
                  부고보기
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="h-auto min-h-0 w-full rounded-none border-0 bg-transparent p-0 text-inherit shadow-none hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                <Link
                  href="/obituary/send"
                  className="ob-dash-act touch-manipulation"
                >
                  <Send aria-hidden />
                  부고발송
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="h-auto min-h-0 w-full rounded-none border-0 bg-transparent p-0 text-inherit shadow-none hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                <Link href="/obituary-form" className="ob-dash-act touch-manipulation">
                  <SquarePen aria-hidden />
                  부고수정
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="h-auto min-h-0 w-full rounded-none border-0 bg-transparent p-0 text-inherit shadow-none hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                <Link
                  href="/obituary/review"
                  className="ob-dash-act touch-manipulation"
                >
                  <Clapperboard aria-hidden />
                  영상관리
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="h-auto min-h-0 w-full rounded-none border-0 bg-transparent p-0 text-inherit shadow-none hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                <Link
                  href="/obituary/mortuary"
                  className="ob-dash-act touch-manipulation"
                >
                  <MessageCircle aria-hidden />
                  메시지
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="h-auto min-h-0 w-full rounded-none border-0 bg-transparent p-0 text-inherit shadow-none hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                <Link
                  href="/obituary/sales"
                  className="ob-dash-act touch-manipulation"
                >
                  <Settings aria-hidden />
                  판매관리
                </Link>
              </Button>
            </div>
          </article>
        </main>

        <footer className="mt-auto border-t border-border bg-muted/50 px-5 py-6 text-center">
          <Button
            asChild
            variant="link"
            className="h-auto p-0 text-lg font-bold tracking-tight text-foreground no-underline hover:opacity-80"
          >
            <a href="tel:0522864440">052-286-4440</a>
          </Button>
          <p className="mt-1 text-[11px] text-muted-foreground">평일 09:00–21:00</p>
          <div className="mt-4 flex flex-wrap justify-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
            <Button
              asChild
              variant="link"
              className="h-auto p-0 text-[10px] text-muted-foreground no-underline hover:text-primary"
            >
              <Link href="/start">홈</Link>
            </Button>
            <span aria-hidden="true">·</span>
            <Button
              asChild
              variant="link"
              className="h-auto p-0 text-[10px] text-muted-foreground no-underline hover:text-primary"
            >
              <Link href="/customer-center">고객센터</Link>
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
