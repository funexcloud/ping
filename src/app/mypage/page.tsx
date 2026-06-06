import Link from "next/link";

/** 마이페이지 허브 — 포인트·혜택은 `/mypage/points`, 부의금은 `/mypage/condolence`. */
export default function MypageHubPage() {
  return (
    <div className="mypage-body m-0 min-h-dvh bg-ping-bg pb-24 font-ping">
      <div className="mx-auto min-h-dvh max-w-[960px] bg-ping-surface shadow-shell sm:mt-3 sm:rounded-ping-shell">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-black/[0.06] bg-ping-surface/95 px-[18px] py-3.5 shadow-[0_1px_0_rgba(0,0,0,0.06)] backdrop-blur-md">
          <Link
            href="/products/ping"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ping text-ping-text no-underline [tap-highlight-color:transparent] hover:bg-ping-field"
            aria-label="뒤로"
          >
            <span aria-hidden="true">‹</span>
          </Link>
          <h1 className="m-0 flex-1 text-[17px] font-extrabold tracking-[-0.03em] text-ping-text">
            마이페이지
          </h1>
        </header>

        <main className="px-[18px] pb-8 pt-5">
          <p className="mb-5 m-0 text-sm leading-[1.55] text-ping-muted">
            이용할 메뉴를 선택하세요.
          </p>
          <Link
            href="/mypage/points"
            className="mb-3 block rounded-ping-lg bg-ping-field px-4 py-[18px] text-[15px] font-bold tracking-[-0.02em] text-ping-text no-underline shadow-ping-xs hover:bg-ping-tint"
          >
            포인트 · 혜택 · 친구 초대
          </Link>
          <Link
            href="/mypage/condolence"
            className="mb-3 block rounded-ping-lg bg-ping-field px-4 py-[18px] text-[15px] font-bold tracking-[-0.02em] text-ping-text no-underline shadow-ping-xs hover:bg-ping-tint"
          >
            부의금 정리
          </Link>
          <p className="mt-5 m-0 text-xs leading-normal text-ping-hint">
            포인트·친구 초대는 혜택 메뉴에서 이용할 수 있습니다.
          </p>
        </main>
      </div>
    </div>
  );
}
