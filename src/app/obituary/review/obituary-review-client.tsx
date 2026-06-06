"use client";

import Link from "next/link";
import {
  approveObituaryEntry,
  fetchObituaryEntry,
  formatDateText,
  formatDateTime,
  isChecked,
  maskAccountNumber,
  type ObituaryEntry,
  type ObituaryPayload,
} from "@/lib/ping-obituary-entry-utils";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Mode = "family" | "public";

function profileMeta(obituary: ObituaryPayload): string {
  const parts: string[] = [];
  if (isChecked(obituary.exposeGender) && obituary.gender) parts.push(obituary.gender);
  if (!isChecked(obituary.hideAge) && obituary.age)
    parts.push(`${obituary.age}${obituary.ageUnit || ""}`);
  return parts.length ? parts.join(" · ") : "추가 정보 없음";
}

export default function ObituaryReviewClient() {
  const searchParams = useSearchParams();
  const token = String(searchParams.get("token") || "").trim();
  const mode: Mode =
    searchParams.get("mode") === "public" ? "public" : "family";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entry, setEntry] = useState<ObituaryEntry | null>(null);
  const [approving, setApproving] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setError("확인 토큰이 없습니다. 링크를 다시 확인해주세요.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchObituaryEntry(token, mode);
      setEntry(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "부고 정보를 불러오지 못했습니다.");
      setEntry(null);
    } finally {
      setLoading(false);
    }
  }, [token, mode]);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async () => {
    if (!entry || entry.status === "published" || mode === "public") return;
    setApproving(true);
    try {
      const result = await approveObituaryEntry(token);
      setEntry(result);
      alert("부고가 공개 상태로 전환되었습니다.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "승인 처리 중 오류가 발생했습니다.");
    } finally {
      setApproving(false);
    }
  };

  const copyPublicUrl = async () => {
    if (!entry?.publicUrl) {
      alert("공개 링크가 아직 준비되지 않았습니다.");
      return;
    }
    try {
      await navigator.clipboard.writeText(entry.publicUrl);
      alert("공개 링크를 복사했습니다.");
    } catch {
      alert(entry.publicUrl);
    }
  };

  const openPublicUrl = () => {
    if (!entry?.publicUrl) {
      alert("공개 링크가 아직 준비되지 않았습니다.");
      return;
    }
    window.open(entry.publicUrl, "_blank", "noopener,noreferrer");
  };

  const o = entry?.obituary;
  const locked = !entry?.canViewFull || !o;
  const mourners = o && Array.isArray(o.mourners) ? o.mourners : [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_35%),linear-gradient(180deg,_#020617,_#111827)] font-sans text-slate-900">
      <header className="mx-auto max-w-5xl px-4 pb-4 pt-8">
        <div className="flex items-center justify-between">
          <Link href="/start" className="inline-flex items-center gap-3 text-white">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
              <span className="text-sky-300" aria-hidden="true">
                ◉
              </span>
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-sky-200/80">PING</p>
              <p className="text-lg font-semibold">부고 확인 센터</p>
            </div>
          </Link>
          <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90">
            {mode === "public" ? "공개 부고" : "유가족 확인"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-12">
        <section className="overflow-hidden rounded-[1.75rem] bg-white shadow-xl shadow-slate-950/25 ring-1 ring-slate-200/60">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-sky-700">
                  {mode === "public" ? "공개 안내" : "유가족 우선 확인"}
                </p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">
                  {mode === "public" ? "부고 안내" : "부고 초안을 확인해주세요"}
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {mode === "public"
                    ? "공개된 부고 내용을 확인할 수 있습니다."
                    : "대표 유가족 확인 후 공개 링크가 활성화됩니다."}
                </p>
              </div>
              {entry && (
                <div className="space-y-3 sm:text-right">
                  <span className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                    {entry.statusLabel || "확인 중"}
                  </span>
                  <div className="text-sm text-slate-500">
                    <p>
                      초안 ID:{" "}
                      <span className="font-semibold text-slate-700">
                        {entry.obituaryId || "-"}
                      </span>
                    </p>
                    <p>
                      승인 시각:{" "}
                      <span className="font-semibold text-slate-700">
                        {entry.approvedAt ? formatDateText(entry.approvedAt) : "미정"}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-8 sm:px-8">
            {loading && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-12 text-center text-slate-500">
                부고 정보를 불러오는 중입니다.
              </div>
            )}

            {error && !loading && (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-8 text-center">
                <p className="text-lg font-semibold text-rose-700">
                  부고 정보를 불러오지 못했습니다.
                </p>
                <p className="mt-2 text-sm text-rose-600">{error}</p>
              </div>
            )}

            {entry && !loading && !error && (
              <div className="space-y-6">
                {entry.notice ? (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800">
                    {entry.notice}
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5">
                    <p className="text-sm font-medium text-slate-500">고인</p>
                    <p className="mt-3 text-2xl font-bold text-slate-900">
                      {locked ? "공개 전" : o?.deceasedName || "미등록"}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {locked ? "유가족 확인이 끝나면 내용이 표시됩니다." : profileMeta(o!)}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-5">
                    <p className="text-sm font-medium text-slate-500">장례식장</p>
                    <p className="mt-3 text-xl font-semibold text-slate-900">
                      {locked ? "확인 대기" : o?.funeralHall || "미정"}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-5">
                    <p className="text-sm font-medium text-slate-500">발인</p>
                    <p className="mt-3 text-xl font-semibold text-slate-900">
                      {locked
                        ? "확인 대기"
                        : formatDateTime(
                            o?.departureDate,
                            o?.departureHour,
                            o?.departureMinute,
                          )}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-5">
                    <p className="text-sm font-medium text-slate-500">장지</p>
                    <p className="mt-3 text-xl font-semibold text-slate-900">
                      {locked ? "확인 대기" : o?.burialPlace || "미정"}
                    </p>
                  </div>
                </div>

                {mode !== "public" && (
                  <div className="rounded-3xl border border-sky-200 bg-sky-50 p-6">
                    <p className="text-sm font-semibold text-sky-700">대표 유가족 안내 상태</p>
                    <p className="mt-2 text-xl font-bold text-slate-900">
                      {entry.familyPrimaryContact
                        ? `${entry.familyPrimaryContact.name || "-"} (${entry.familyPrimaryContact.phone || "-"})`
                        : "-"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {entry.familyNotification?.message ||
                        "안내 상태 정보가 없습니다."}
                    </p>
                    <div className="mt-4 text-sm text-slate-500">
                      <p>
                        생성 시각:{" "}
                        <span className="font-semibold text-slate-700">
                          {entry.createdAt ? formatDateText(entry.createdAt) : "미정"}
                        </span>
                      </p>
                      <p>
                        최종 수정:{" "}
                        <span className="font-semibold text-slate-700">
                          {entry.updatedAt ? formatDateText(entry.updatedAt) : "미정"}
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <section className="rounded-3xl border border-slate-200 bg-white p-6">
                    <h2 className="text-xl font-bold text-slate-900">일정 요약</h2>
                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                      {(
                        [
                          ["임종", o?.deathDate, o?.deathHour, o?.deathMinute],
                          ["입실", o?.entryDate, o?.entryHour, o?.entryMinute],
                          ["입관", o?.viewingDate, o?.viewingHour, o?.viewingMinute],
                        ] as const
                      ).map(([label, d, h, m]) => (
                        <div key={label} className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-sm font-medium text-slate-500">{label}</p>
                          <p className="mt-2 font-semibold text-slate-900">
                            {locked ? "확인 대기" : formatDateTime(d, h, m)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="rounded-3xl border border-slate-200 bg-white p-6">
                    <h2 className="text-xl font-bold text-slate-900">계좌 정보</h2>
                    <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                      {locked ? (
                        "유가족 확인 후 공개됩니다."
                      ) : !o?.bankName && !o?.accountNumber && !o?.accountHolder ? (
                        "등록된 계좌 정보가 없습니다."
                      ) : (
                        <>
                          <p>
                            <strong>은행:</strong> {o.bankName || "미등록"}
                          </p>
                          <p>
                            <strong>계좌번호:</strong>{" "}
                            {maskAccountNumber(
                              o.accountNumber || "미등록",
                              o.hideAccountLastDigits,
                            )}
                          </p>
                          <p>
                            <strong>예금주:</strong> {o.accountHolder || "미등록"}
                          </p>
                        </>
                      )}
                    </div>
                  </section>
                </div>

                <section className="rounded-3xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">상주 정보</h2>
                    <span className="text-sm text-slate-500">{mourners.length}명</span>
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {locked ? (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                        유가족 확인 후 공개됩니다.
                      </div>
                    ) : mourners.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                        등록된 상주 정보가 없습니다.
                      </div>
                    ) : (
                      mourners.map((m, i) => (
                        <article
                          key={`${m.name}-${i}`}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <p className="text-sm font-medium text-slate-500">
                            {m.relation || "관계 미정"}
                          </p>
                          <p className="mt-2 text-lg font-semibold text-slate-900">
                            {m.name || "이름 미등록"}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {isChecked(o?.hideMournerContact)
                              ? "비공개"
                              : m.phone || "연락처 없음"}
                          </p>
                        </article>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-slate-900">근조화환 주문</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        주문·배송 안내는 화환 전문 파트너 페이지에서 진행됩니다.
                      </p>
                    </div>
                    <a
                      href="https://shop7.flowerbiz.co.kr/products/product-category/197"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
                    >
                      근조화환 주문하기
                    </a>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6">
                  <h2 className="text-xl font-bold text-slate-900">전달 문구</h2>
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    {locked ? (
                      <article className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                        유가족 확인 후 공개됩니다.
                      </article>
                    ) : (
                      <>
                        {o?.mournerMessageText ? (
                          <article className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-sm font-medium text-slate-500">상주 말씀</p>
                            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                              {o.mournerMessageText}
                            </p>
                          </article>
                        ) : null}
                        {o?.notificationMessageText ? (
                          <article className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-sm font-medium text-slate-500">알림 문구</p>
                            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                              {o.notificationMessageText}
                            </p>
                          </article>
                        ) : null}
                        {!o?.mournerMessageText && !o?.notificationMessageText ? (
                          <article className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                            등록된 문구가 없습니다.
                          </article>
                        ) : null}
                      </>
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 text-sm">
                      <p className="font-semibold text-slate-600">확인 링크</p>
                      <p className="mt-2 break-all text-slate-500">{entry.reviewUrl || "-"}</p>
                      <p className="mt-4 font-semibold text-slate-600">공개 링크</p>
                      <p className="mt-2 break-all text-slate-500">{entry.publicUrl || "-"}</p>
                      {mode !== "public" && entry.sendUrl ? (
                        <div className="mt-4">
                          <p className="font-semibold text-slate-600">부고 보내기 주소</p>
                          <p className="mt-2 break-all text-slate-500">{entry.sendUrl}</p>
                          <Link
                            href={entry.sendUrl}
                            className="mt-3 inline-flex items-center justify-center rounded-2xl bg-[#0097A9] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                          >
                            부고 보내기 화면 열기
                          </Link>
                          {entry.salesUrl ? (
                            <div className="mt-4">
                              <p className="font-semibold text-slate-600">판매 관리</p>
                              <p className="mt-2 break-all text-slate-500">{entry.salesUrl}</p>
                              <Link
                                href={entry.salesUrl}
                                className="mt-3 inline-flex items-center justify-center rounded-2xl border-2 border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                              >
                                판매 관리 열기
                              </Link>
                            </div>
                          ) : null}
                          {entry.mortuaryUrl ? (
                            <div className="mt-4">
                              <p className="font-semibold text-slate-600">
                                장례 메시지 (상주 알림)
                              </p>
                              <p className="mt-2 break-all text-slate-500">
                                {entry.mortuaryUrl}
                              </p>
                              <Link
                                href={entry.mortuaryUrl}
                                className="mt-3 inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                              >
                                장례 메시지 화면 열기
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      {mode !== "public" && (
                        <button
                          type="button"
                          onClick={() => void approve()}
                          disabled={approving || entry.status === "published"}
                          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {approving
                            ? "승인 처리 중..."
                            : entry.status === "published"
                              ? "공개 완료"
                              : "유가족 확인 완료"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void copyPublicUrl()}
                        className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        공개 링크 복사
                      </button>
                      <button
                        type="button"
                        onClick={openPublicUrl}
                        className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        공개 화면 열기
                      </button>
                      <button
                        type="button"
                        onClick={() => void load()}
                        className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        새로고침
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
