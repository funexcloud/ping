"use client";

import Link from "next/link";
import {
  fetchReferralBalance,
  getShareUrl,
  readLocalMiscPoints,
  registerMyCode,
} from "@/lib/ping-referral-client";
import { useCallback, useEffect, useState } from "react";

export default function MypagePointsClient() {
  const [code, setCode] = useState("—");
  const [shareUrl, setShareUrl] = useState("#");
  const [refPts, setRefPts] = useState(0);
  const [friends, setFriends] = useState(0);
  const [localPts, setLocalPts] = useState(0);
  const [syncHint, setSyncHint] = useState("");
  const [copyLabel, setCopyLabel] = useState("링크 복사");

  const refresh = useCallback(async () => {
    const c = await registerMyCode();
    setCode(c);
    const url = getShareUrl();
    setShareUrl(url);
    const bal = await fetchReferralBalance();
    const rp = bal.ok ? Math.max(0, Math.floor(Number(bal.points) || 0)) : 0;
    const fc = bal.ok ? Math.max(0, Math.floor(Number(bal.friendCount) || 0)) : 0;
    const local = readLocalMiscPoints();
    setRefPts(rp);
    setFriends(fc);
    setLocalPts(local);
    setSyncHint(bal.ok ? "" : "추천 포인트는 서버 연결 시 집계됩니다.");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const copyLink = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopyLabel("복사됨");
      setTimeout(() => setCopyLabel("링크 복사"), 2000);
    } catch {
      window.prompt("링크를 복사하세요", url);
    }
  };

  const total = refPts + localPts;

  return (
    <div className="mypage-body m-0 min-h-dvh bg-ping-bg pb-24 font-ping">
      <div className="mypage-shell mx-auto min-h-dvh max-w-[960px] bg-ping-surface shadow-shell sm:mt-3 sm:rounded-ping-shell">
        <header className="mypage-head sticky top-0 z-10 flex items-center gap-3 border-b border-black/[0.06] bg-ping-surface/95 px-[18px] py-3.5 shadow-[0_1px_0_rgba(0,0,0,0.06)] backdrop-blur-md">
          <Link
            href="/products/ping"
            className="ping-back-btn touch-manipulation"
            aria-label="뒤로"
          >
            <span className="ping-chevron-left" aria-hidden="true" />
          </Link>
          <h1 className="m-0 flex-1 text-[17px] font-extrabold tracking-[-0.03em] text-ping-text">
            마이페이지
          </h1>
        </header>

        <nav className="mypage-tabs" aria-label="마이페이지 구역">
          <Link href="/mypage" className="mypage-tab">
            시작
          </Link>
          <Link href="/mypage/points" className="mypage-tab is-active" aria-current="page">
            혜택 · 포인트
          </Link>
          <Link href="/mypage/condolence" className="mypage-tab">
            부의금 정리
          </Link>
        </nav>

        <main className="mypage-main px-[18px] pb-8 pt-5">
          <div className="mypage-card">
            <h2>포인트 · 혜택</h2>
            <div className="mypage-points-total">
              <span>{total.toLocaleString("ko-KR")}</span>
              <span className="unit">P</span>
            </div>
            <div className="mypage-points-detail">
              참여 적립(카운트다운) <strong>0P</strong>
              <br />
              링크 추천 적립 <strong>{refPts.toLocaleString("ko-KR")}P</strong> · 추천 가입{" "}
              <strong>{friends}명</strong>
              <br />
              초대장 발송 누적 <strong>0건</strong>
              <br />
              5,000원 쿠폰 <strong>—</strong>
              <br />
              기타(로컬) <strong>{localPts.toLocaleString("ko-KR")}P</strong>
            </div>
            {syncHint ? (
              <p className="mypage-sync-hint" aria-live="polite">
                {syncHint}
              </p>
            ) : null}
          </div>

          <div className="mypage-card">
            <span className="mypage-badge">혜택 관리 · 친구 초대</span>
            <h2>친구 초대하기</h2>
            <p className="mypage-referral-desc">
              아래에서 바로 초대장을 보내거나, 링크를 공유해 보세요. (배치당 최대 3명 · 서버에
              기록)
            </p>
            <p className="mypage-referral-desc mypage-subtle-label">추천 링크</p>
            <div className="mypage-code-box">{code}</div>
            <div className="mypage-link-box">
              <a href={shareUrl}>{shareUrl}</a>
            </div>
            <button
              type="button"
              className="mypage-copy-btn"
              onClick={() => void copyLink()}
            >
              {copyLabel}
            </button>
          </div>

          <p className="mypage-copy">
            참여 카운트다운은 화면 상단·중앙에서 확인할 수 있습니다.
          </p>
        </main>
      </div>
    </div>
  );
}
