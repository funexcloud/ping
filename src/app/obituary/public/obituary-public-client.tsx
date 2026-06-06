"use client";

import {
  fetchObituaryEntry,
  formatDateTime,
  isChecked,
  maskAccountNumber,
  type ObituaryEntry,
  type ObituaryPayload,
} from "@/lib/ping-obituary-entry-utils";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function mournerNamesOrdered(obituary: ObituaryPayload): string {
  const list = Array.isArray(obituary.mourners) ? obituary.mourners : [];
  return list.map((m) => m.name).filter(Boolean).join(", ") || "—";
}

export default function ObituaryPublicClient() {
  const searchParams = useSearchParams();
  const token = String(searchParams.get("token") || "").trim();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entry, setEntry] = useState<ObituaryEntry | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError("유효한 링크가 아닙니다.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchObituaryEntry(token, "public");
      setEntry(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      setEntry(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title =
      entry?.obituary?.deceasedName != null
        ? `故 ${entry.obituary.deceasedName}`
        : "PING 부고 안내";
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: "부고 안내 페이지입니다.",
          url,
        });
        return;
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      alert("링크를 복사했습니다.");
    } catch {
      window.prompt("공유할 주소", url);
    }
  };

  const copyUrl = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
      alert("주소를 복사했습니다.");
    } catch {
      window.prompt("아래 주소를 복사해주세요.", url);
    }
  };

  const o = entry?.obituary;
  const locked = !entry?.canViewFull || !o;

  const meta: string[] = [];
  if (o && isChecked(o.exposeGender) && o.gender) meta.push(o.gender);
  if (o && !isChecked(o.hideAge) && o.age) meta.push(`${o.age}${o.ageUnit || ""}`);

  const sched: { label: string; text: string }[] = [];
  if (o) {
    const pushIf = (
      label: string,
      date?: string,
      h?: string,
      m?: string,
      key?: string,
    ) => {
      if (o.scheduleShowOnObituary && key && o.scheduleShowOnObituary[key] === false)
        return;
      sched.push({ label, text: formatDateTime(date, h, m) });
    };
    pushIf("임종", o.deathDate, o.deathHour, o.deathMinute, "death");
    pushIf("입실", o.entryDate, o.entryHour, o.entryMinute, "entry");
    pushIf("입관", o.viewingDate, o.viewingHour, o.viewingMinute, "coffin");
    pushIf("발인", o.departureDate, o.departureHour, o.departureMinute, "departure");
  }

  const mourners = o && Array.isArray(o.mourners) ? o.mourners : [];

  return (
    <div className="ping-ui ob-flow-page ping-recipient-page min-h-screen">
      <div className="ob-flow-shell">
        <header className="ob-flow-hero ob-flow-hero--spacious ping-sticky-page-header">
          <span className="ob-flow-eyebrow">PING · 부고 안내</span>
          {loading && <p className="ob-flow-loading py-8">불러오는 중입니다…</p>}
          {error && !loading && <p className="ob-flow-error">{error}</p>}
          {!loading && !error && entry && (
            <div>
              <h1 className="ob-flow-hero-title ob-flow-hero-title--lg">
                {locked ? "故 비공개" : `故 ${o?.deceasedName || "—"}`}
              </h1>
              <p className="ob-flow-hero-sub">
                {locked
                  ? "유가족 확인 후 공개됩니다."
                  : meta.length
                    ? meta.join(" · ")
                    : ""}
              </p>
              {entry.notice ? (
                <p className="mt-4 rounded-xl border border-amber-300/35 bg-amber-400/10 px-3 py-2 text-[13px] leading-relaxed text-amber-100">
                  {entry.notice}
                </p>
              ) : null}
            </div>
          )}
        </header>

        {!loading && !error && entry && (
          <main className="ob-flow-main ob-flow-main--overlap">
            <div className="ob-flow-card">
              <div className="px-4 pt-4 pb-1">
                <h2 className="ob-flow-inset-title">모시는 곳</h2>
              </div>
              <div className="px-4 pb-3 text-sm">
                <div className="ob-pub-row">
                  <span className="ob-pub-k">상주</span>
                  <span className="ob-pub-v">
                    {locked ? "—" : mournerNamesOrdered(o!)}
                  </span>
                </div>
                <div className="ob-pub-row">
                  <span className="ob-pub-k">입실일자</span>
                  <span className="ob-pub-v">
                    {locked
                      ? "—"
                      : formatDateTime(o?.entryDate, o?.entryHour, o?.entryMinute)}
                  </span>
                </div>
                <div className="ob-pub-row">
                  <span className="ob-pub-k">장례식장</span>
                  <span className="ob-pub-v">{locked ? "—" : o?.funeralHall || "—"}</span>
                </div>
                <div className="ob-pub-row">
                  <span className="ob-pub-k">호실</span>
                  <span className="ob-pub-v">
                    {locked
                      ? "—"
                      : o?.funeralRoom?.trim()
                        ? o.funeralRoom
                        : "—"}
                  </span>
                </div>
                <div className="ob-pub-row">
                  <span className="ob-pub-k">장지</span>
                  <span className="ob-pub-v">{locked ? "—" : o?.burialPlace || "—"}</span>
                </div>
              </div>
            </div>

            {sched.length > 0 && !locked && (
              <section className="ob-flow-card ob-flow-card--padded">
                <h2 className="ob-flow-section-title">일정</h2>
                <div className="ob-pub-grid mt-3 text-sm">
                  {sched.map((s) => (
                    <div key={s.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="ob-pub-label m-0 text-slate-700">{s.label}</p>
                      <p className="ob-pub-value mt-1 font-semibold text-slate-900">{s.text}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="ob-flow-card ob-flow-card--padded">
              <h2 className="ob-flow-section-title">상주 · 연락</h2>
              <div className="mt-3 space-y-2 text-sm">
                {locked ? (
                  <p className="text-slate-500">공개 후 표시됩니다.</p>
                ) : mourners.length === 0 ? (
                  <p className="text-slate-500">등록된 상주 정보가 없습니다.</p>
                ) : (
                  mourners.map((m, i) => {
                    const phone = isChecked(o?.hideMournerContact)
                      ? "비공개"
                      : m.phone || "—";
                    return (
                      <div
                        key={`${m.name}-${i}`}
                        className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                      >
                        <p className="text-xs font-semibold text-slate-500">
                          {m.relation || "상주"}
                        </p>
                        <p className="mt-1 font-bold text-slate-900">{m.name || "—"}</p>
                        <p className="mt-0.5 text-slate-600">{phone}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="ob-flow-card ob-flow-card--padded">
              <h2 className="ob-flow-section-title">전달 말씀</h2>
              <div className="mt-3 space-y-3 text-sm">
                {locked ? (
                  <p className="text-slate-500">공개 후 표시됩니다.</p>
                ) : (
                  <>
                    {o?.mournerMessageText ? (
                      <div className="whitespace-pre-line rounded-xl bg-slate-50 p-3">
                        {o.mournerMessageText}
                      </div>
                    ) : null}
                    {o?.notificationMessageText ? (
                      <div className="whitespace-pre-line rounded-xl bg-slate-50 p-3">
                        {o.notificationMessageText}
                      </div>
                    ) : null}
                    {!o?.mournerMessageText && !o?.notificationMessageText ? (
                      <p className="text-slate-500">등록된 말씀이 없습니다.</p>
                    ) : null}
                  </>
                )}
              </div>
            </section>

            <section className="ob-flow-card ob-flow-card--padded">
              <h2 className="ob-flow-section-title">부의 계좌</h2>
              <div className="mt-3 text-sm leading-relaxed text-slate-600">
                {locked ? (
                  "공개 후 표시됩니다."
                ) : !o?.bankName && !o?.accountNumber && !o?.accountHolder ? (
                  "등록된 계좌 정보가 없습니다."
                ) : (
                  <>
                    <p>
                      <strong>은행</strong> {o.bankName || "—"}
                    </p>
                    <p className="mt-1">
                      <strong>계좌</strong>{" "}
                      {maskAccountNumber(o.accountNumber, o.hideAccountLastDigits) ||
                        "—"}
                    </p>
                    <p className="mt-1">
                      <strong>예금주</strong> {o.accountHolder || "—"}
                    </p>
                  </>
                )}
              </div>
            </section>

            <div className="flex flex-col gap-3 pt-1">
              <button
                type="button"
                className="ob-flow-btn-primary"
                onClick={() => void share()}
              >
                링크 공유
              </button>
              <button
                type="button"
                className="ob-flow-btn-secondary"
                onClick={() => void copyUrl()}
              >
                주소 복사
              </button>
            </div>

            <p className="ob-flow-footer mt-6 pb-4">
              한국AIBC융합원 PING 서비스 · 문의 052-286-4440
            </p>
          </main>
        )}
      </div>
    </div>
  );
}
