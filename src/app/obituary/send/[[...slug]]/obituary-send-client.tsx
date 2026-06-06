"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function apiBase(): string {
  if (typeof window === "undefined") return "/api";
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return "http://127.0.0.1:3000/api";
  return "/api";
}

type Mourner = { name?: string; relation?: string; phone?: string };
type Obituary = {
  deceasedName?: string;
  mourners?: Mourner[];
  hideMournerContact?: boolean | string | number;
};

type EntryData = {
  obituaryId?: string;
  canViewFull?: boolean;
  obituary?: Obituary | null;
  statusLabel?: string;
  familyPrimaryContact?: { phone?: string };
};

function isChecked(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === 1 || value === "1";
}

function normalizePhone(v: string): string {
  return String(v || "").replace(/[^0-9]/g, "");
}

export default function ObituarySendClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const slugParts = params.slug as string[] | undefined;
  const pathObituaryId = Array.isArray(slugParts) && slugParts.length ? slugParts[0] : "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entryData, setEntryData] = useState<EntryData | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [otherPhone, setOtherPhone] = useState("");

  const load = useCallback(async () => {
    if (!token) {
      setError(
        "유효한 링크가 아닙니다. 부고 확인·작성 화면에서 발급된 보내기 주소를 이용해주세요.",
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBase()}/getObituaryEntry?token=${encodeURIComponent(token)}&mode=family`,
      );
      const data = (await res.json().catch(() => ({}))) as EntryData & {
        error?: string;
        message?: string;
      };
      if (!res.ok) throw new Error(data.error || data.message || "불러오지 못했습니다.");
      if (pathObituaryId && data.obituaryId && pathObituaryId !== data.obituaryId) {
        setError("주소의 부고 ID와 링크 토큰이 일치하지 않습니다.");
        setLoading(false);
        return;
      }
      setEntryData(data);
      const list = Array.isArray(data.obituary?.mourners) ? data.obituary!.mourners! : [];
      const init: Record<number, boolean> = {};
      list.forEach((_, i) => {
        init[i] = true;
      });
      setSelected(init);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      setLoading(false);
    }
  }, [token, pathObituaryId]);

  useEffect(() => {
    load();
  }, [load]);

  const obituary = entryData?.obituary;
  const mourners = Array.isArray(obituary?.mourners) ? obituary!.mourners! : [];

  const heroSub = (() => {
    if (!entryData) return "";
    const sub: string[] = [];
    if (entryData.canViewFull && obituary?.deceasedName) {
      sub.push(`故 ${obituary.deceasedName}`);
    } else if (obituary?.deceasedName) {
      sub.push(`故 ${obituary.deceasedName}`);
    } else {
      sub.push("유가족 확인용 링크입니다.");
    }
    if (entryData.statusLabel) sub.push(entryData.statusLabel);
    return sub.join(" · ");
  })();

  const toggleAll = () => {
    const next: Record<number, boolean> = {};
    mourners.forEach((_, i) => {
      next[i] = true;
    });
    setSelected(next);
  };

  const getSelectedMourners = () => mourners.filter((_, i) => selected[i]);

  const canInteract = !!(entryData?.canViewFull && obituary);

  return (
    <div className="ob-flow-shell">
      <header className="ob-flow-hero ping-sticky-page-header">
        <span className="ob-flow-eyebrow">PING · 부고</span>
        {loading && <div className="ob-flow-loading">불러오는 중입니다…</div>}
        {error && !loading && <div className="ob-flow-error">{error}</div>}
        {!loading && !error && entryData && (
          <div>
            <h1 className="ob-flow-hero-title">부고 보내기</h1>
            <p className="ob-flow-hero-sub">{heroSub}</p>
          </div>
        )}
      </header>

      {!loading && !error && entryData && (
        <main className="ob-flow-main">
          <section className="ob-flow-card">
            <div className="ob-flow-card-head">
              <h2 className="ob-flow-section-title">상주에게 보내기</h2>
              <button
                type="button"
                className="mt-2 cursor-pointer touch-manipulation border-0 bg-transparent p-0 text-[13px] font-semibold text-[var(--ping-primary)]"
                onClick={toggleAll}
              >
                모두 선택
              </button>
            </div>
            <p className="ob-flow-hint px-4 pt-3">
              부고 안내는 카카오톡으로 발송되며, 수신자가 카카오톡 미이용 시 문자로 자동 전환되어 발송됩니다.
              <span className="text-[var(--ping-ui-text-hint)]">
                (실제 발송은 서비스 연동 후 가능합니다.)
              </span>
            </p>
            <div className="space-y-2 px-4 py-3">
              {!canInteract ? (
                <p className="py-2 text-[13px] text-slate-500">
                  아직 공개 전이거나 확인할 수 없는 부고입니다. 유가족 확인이 완료된 뒤 이용해주세요.
                </p>
              ) : mourners.length === 0 ? (
                <p className="py-2 text-[13px] text-slate-500">
                  등록된 상주가 없습니다. 부고 확인 화면에서 상주를 입력한 뒤 다시 시도해주세요.
                </p>
              ) : (
                mourners.map((m, i) => {
                  const hideContact = isChecked(obituary!.hideMournerContact);
                  const phone = hideContact ? "" : m.phone || "";
                  const phoneLabel = hideContact ? "연락처 비공개" : phone || "번호 없음";
                  return (
                    <label key={i} className="ob-flow-mourner-row">
                      <input
                        type="checkbox"
                        className="mourner-cb mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-[var(--ping-primary)] focus:ring-[var(--ping-primary)]"
                        checked={!!selected[i]}
                        onChange={(e) => setSelected((s) => ({ ...s, [i]: e.target.checked }))}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--ping-muted)]">
                          {m.relation || "상주"}
                        </span>
                        <span className="mt-0.5 block text-[14px] font-bold text-slate-900">
                          {m.name || "—"}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-slate-600">{phoneLabel}</span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            <div className="px-4 pb-4">
              <button
                type="button"
                className="ob-flow-btn-primary"
                disabled={!canInteract || mourners.length === 0}
                onClick={() => {
                  const chosen = getSelectedMourners();
                  if (!chosen.length) {
                    alert("보낼 상주를 한 명 이상 선택해주세요.");
                    return;
                  }
                  const names = chosen.map((m) => m.name || "상주").join(", ");
                  alert(
                    `[데모] 선택한 상주(${names})에게 부고를 보내는 기능은 알림 연동 후 제공됩니다.\n실서비스에서는 카카오톡 우선 · 미가입 시 문자로 발송됩니다.`,
                  );
                }}
              >
                선택한 상주에게 부고 보내기
              </button>
            </div>
          </section>

          <section className="ob-flow-card">
            <div className="ob-flow-card-head">
              <h2 className="ob-flow-section-title">다른 번호로 보내기</h2>
            </div>
            <div className="space-y-3 px-4 pb-4 pt-3">
              <button
                type="button"
                className="ob-flow-btn-secondary bg-[rgba(248,250,252,0.95)]"
                disabled={!canInteract}
                onClick={() => {
                  const mePhone = entryData?.familyPrimaryContact?.phone || "";
                  if (mePhone) setOtherPhone(mePhone);
                  else alert("대표 유가족 연락처가 없어 자동 입력할 수 없습니다.");
                }}
              >
                나에게 보내기
              </button>
              <div>
                <label htmlFor="otherPhone" className="ob-flow-label">
                  휴대폰 번호
                </label>
                <input
                  id="otherPhone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="01012345678"
                  className="ob-flow-input text-[15px]"
                  value={otherPhone}
                  onChange={(e) => setOtherPhone(e.target.value)}
                />
              </div>
              <p className="ob-flow-callout">
                다른 번호로 부고를 보낼 경우 <strong>모든 계좌가 노출</strong>되는 설정으로 진행됩니다.
              </p>
              <button
                type="button"
                className="ob-flow-btn-primary ob-flow-btn-inverse"
                disabled={!canInteract}
                onClick={() => {
                  const phone = normalizePhone(otherPhone);
                  if (phone.length < 10) {
                    alert("휴대폰 번호를 올바르게 입력해주세요.");
                    return;
                  }
                  alert(
                    `[데모] ${phone} 번호로 부고를 보냅니다. 다른 번호 발송 시 계좌 전체 노출 옵션이 적용됩니다.\n실제 발송 API 연동 전까지는 시뮬레이션만 됩니다.`,
                  );
                }}
              >
                입력한 번호로 부고 보내기
              </button>
            </div>
          </section>

          <Link
            href="/obituary-create"
            className="touch-manipulation py-2 text-center text-[14px] font-semibold text-[var(--ping-primary)] no-underline"
          >
            홈으로
          </Link>
          <p className="ob-flow-footer pb-4">한국AIBC융합원 PING 서비스 · 문의 052-286-4440</p>
        </main>
      )}
    </div>
  );
}
