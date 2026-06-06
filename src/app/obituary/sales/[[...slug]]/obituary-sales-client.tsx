"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function apiBase(): string {
  if (typeof window === "undefined") return "/api";
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return "http://127.0.0.1:3000/api";
  return "/api";
}

type SaleRow = {
  title?: string;
  kind?: string;
  status?: string;
  payerName?: string;
  note?: string;
  paidAt?: string;
  createdAt?: string;
  orderId?: string;
  amount?: number;
};

type SalesPayload = {
  deceasedName?: string;
  statusLabel?: string;
  canManage?: boolean;
  summary?: { totalAmount?: number; saleCount?: number };
  items?: SaleRow[];
};

function formatWon(n: number): string {
  const x = Number(n) || 0;
  return `${x.toLocaleString("ko-KR")}원`;
}

function kindLabel(kind: string): string {
  if (kind === "payment") return "결제";
  if (kind === "manual") return "장부";
  return kind || "기타";
}

export default function ObituarySalesClient() {
  const searchParams = useSearchParams();
  const bugoCode = String(
    searchParams.get("bugoCode") || searchParams.get("obituaryId") || "",
  ).trim();
  const token = String(searchParams.get("token") || "").trim();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SalesPayload | null>(null);
  const [inTitle, setInTitle] = useState("");
  const [inAmount, setInAmount] = useState("");
  const [inPayer, setInPayer] = useState("");
  const [inNote, setInNote] = useState("");

  const loadSales = useCallback(async () => {
    if (!bugoCode || !token) {
      setError(
        "주소에 bugoCode와 token이 필요합니다. 부고 확인 화면에서 발급된 판매 관리 링크를 사용해주세요.",
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = `${apiBase()}/getObituarySales?bugoCode=${encodeURIComponent(bugoCode)}&token=${encodeURIComponent(token)}`;
      const res = await fetch(url);
      const json = (await res.json().catch(() => ({}))) as SalesPayload & {
        error?: string;
        message?: string;
      };
      if (!res.ok) throw new Error(json.error || json.message || "불러오지 못했습니다.");
      setData(json);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      setLoading(false);
    }
  }, [bugoCode, token]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const addManual = async () => {
    const title = inTitle.trim() || "장부 기록";
    const amount = Number(inAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("금액을 입력해주세요.");
      return;
    }
    try {
      const res = await fetch(`${apiBase()}/postObituarySale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bugoCode,
          token,
          amount,
          title,
          payerName: inPayer.trim() || null,
          note: inNote.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || json.message || "저장 실패");
      setInAmount("");
      setInNote("");
      await loadSales();
    } catch (e) {
      alert(e instanceof Error ? e.message : "오류");
    }
  };

  const items = Array.isArray(data?.items) ? data!.items! : [];
  const reviewHref =
    bugoCode && token
      ? `/obituary/review?mode=family&token=${encodeURIComponent(token)}`
      : "/obituary/review";

  return (
    <div className="ob-flow-shell">
      <header className="ob-flow-hero ping-sticky-page-header">
        <span className="ob-flow-eyebrow">PING · 장례 매출</span>
        {loading && <div className="ob-flow-loading">불러오는 중입니다…</div>}
        {error && !loading && <div className="ob-flow-error">{error}</div>}
        {!loading && !error && data && (
          <div>
            <h1 className="ob-flow-hero-title">판매 관리</h1>
            <p className="ob-flow-hero-sub">
              {(() => {
                const name = data.deceasedName ? `故 ${data.deceasedName}` : "부고";
                const tail = data.statusLabel ? ` · ${data.statusLabel}` : "";
                return `${name}${tail}`.replace(/·\s*$/, "").trim();
              })()}
            </p>
            <p className="ob-flow-hero-muted">
              {data.canManage
                ? "유가족 링크로 접속했습니다. 내역 추가와 결제 연동 확인이 가능합니다."
                : "공개 링크로 보는 중입니다. 목록만 확인할 수 있습니다."}
            </p>
          </div>
        )}
      </header>

      {!loading && !error && data && (
        <main className="ob-flow-main">
          <div className="grid grid-cols-2 gap-3">
            <div className="ob-flow-card ob-flow-card--flat ob-flow-card--padded">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--ping-muted)]">
                누적 매출
              </p>
              <p className="mt-1 text-lg font-extrabold tabular-nums text-slate-900">
                {formatWon(data.summary?.totalAmount ?? 0)}
              </p>
            </div>
            <div className="ob-flow-card ob-flow-card--flat ob-flow-card--padded">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--ping-muted)]">
                이력 건수
              </p>
              <p className="mt-1 text-lg font-extrabold tabular-nums text-slate-900">
                {data.summary?.saleCount ?? 0}건
              </p>
            </div>
          </div>

          {data.canManage ? (
            <section className="ob-flow-card">
              <div className="ob-flow-card-head ob-flow-card-head--soft">
                <h2 className="ob-flow-section-title">내역 직접 기록</h2>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--ping-muted)]">
                  현금 부의·기타 수입 등 유가족이 장부에 남길 수 있습니다.
                </p>
              </div>
              <div className="space-y-3 px-4 py-4">
                <div>
                  <label className="ob-flow-label" htmlFor="inTitle">
                    내역
                  </label>
                  <input
                    id="inTitle"
                    type="text"
                    className="ob-flow-input"
                    placeholder="예: 근조화환, 부의금"
                    value={inTitle}
                    onChange={(e) => setInTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="ob-flow-label" htmlFor="inAmount">
                    금액 (원)
                  </label>
                  <input
                    id="inAmount"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    className="ob-flow-input tabular-nums"
                    placeholder="100000"
                    value={inAmount}
                    onChange={(e) => setInAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="ob-flow-label" htmlFor="inPayer">
                    입금자 (선택)
                  </label>
                  <input
                    id="inPayer"
                    type="text"
                    className="ob-flow-input"
                    placeholder="홍길동"
                    value={inPayer}
                    onChange={(e) => setInPayer(e.target.value)}
                  />
                </div>
                <div>
                  <label className="ob-flow-label" htmlFor="inNote">
                    메모 (선택)
                  </label>
                  <input
                    id="inNote"
                    type="text"
                    className="ob-flow-input"
                    value={inNote}
                    onChange={(e) => setInNote(e.target.value)}
                  />
                </div>
                <button type="button" className="ob-flow-btn-primary" onClick={addManual}>
                  기록 추가
                </button>
              </div>
            </section>
          ) : null}

          <section className="ob-flow-card">
            <div className="ob-flow-card-head flex flex-row items-center justify-between gap-2">
              <h2 className="ob-flow-section-title">매출 · 수금 목록</h2>
              <button
                type="button"
                className="shrink-0 cursor-pointer touch-manipulation border-0 bg-transparent p-0 text-[13px] font-semibold text-[var(--ping-primary)]"
                onClick={() => loadSales()}
              >
                새로고침
              </button>
            </div>
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-[13px] leading-relaxed text-[var(--ping-muted)]">
                등록된 내역이 없습니다.
                <br />
                결제 시 주문에 부고 코드(
                <code className="rounded bg-slate-100 px-1 text-xs">bugoCode</code>)를 넘기거나, 위에서 직접
                기록하세요.
              </div>
            ) : (
              <ul className="divide-y divide-[var(--ping-ui-line)]">
                {items.map((row, idx) => {
                  const when = row.paidAt || row.createdAt || "—";
                  const sub = [kindLabel(String(row.kind || "")), row.status].filter(Boolean).join(" · ");
                  const extra = [row.payerName, row.note].filter(Boolean).join(" · ");
                  return (
                    <li key={idx} className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold leading-snug text-slate-900">
                            {row.title || "내역"}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">{sub}</p>
                          {extra ? <p className="mt-1 text-[12px] text-slate-600">{extra}</p> : null}
                          <p className="mt-1 font-mono text-[11px] text-slate-400">{String(when)}</p>
                          {row.orderId ? (
                            <p className="mt-0.5 text-[10px] text-slate-400">주문 {row.orderId}</p>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-[15px] font-extrabold tabular-nums text-slate-900">
                          {formatWon(row.amount ?? 0)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <div className="ob-flow-link-row">
            <Link href={reviewHref} className="ob-flow-link">
              부고 확인
            </Link>
            <Link href="/obituary-create" className="ob-flow-link">
              홈
            </Link>
          </div>
          <p className="ob-flow-footer pb-4">한국AIBC융합원 PING · 문의 052-286-4440</p>
        </main>
      )}
    </div>
  );
}
