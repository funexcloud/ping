"use client";

import { BulkFlowProgress } from "@/components/bulk/bulk-flow-progress";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { CondolenceMoney, Contact } from "@prisma/client";

type Row = CondolenceMoney & { contact: Contact };

function formatKRW(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

function formatPhoneDisplay(phone: string | null): string {
  if (!phone) return "—";
  const d = phone.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("010")) {
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return phone;
}

const tabBase =
  "flex-1 -mb-px border-b-2 border-transparent py-3 px-2 text-center text-sm font-semibold no-underline";
const tabInactive = `${tabBase} text-ping-muted`;
const tabActive = `${tabBase} border-ping-primary text-ping-primary`;

export function CondolenceClient() {
  const searchParams = useSearchParams();
  const qBugo = searchParams.get("bugoRequestId");

  const [bugoRequestId, setBugoRequestId] = useState(qBugo ?? "");
  useEffect(() => {
    if (qBugo) setBugoRequestId(qBugo);
  }, [qBugo]);

  const effectiveBugoId = bugoRequestId.trim();

  const [items, setItems] = useState<Row[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [count, setCount] = useState(0);
  const [average, setAverage] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!effectiveBugoId) {
      setItems([]);
      setTotalAmount(0);
      setCount(0);
      setAverage(0);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/condolence?bugoRequestId=${encodeURIComponent(effectiveBugoId)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "목록을 불러오지 못했습니다.");
      }
      setItems(data.items ?? []);
      setTotalAmount(data.totalAmount ?? 0);
      setCount(data.count ?? 0);
      setAverage(data.average ?? 0);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, [effectiveBugoId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const [mode, setMode] = useState<"direct" | "file">("direct");
  const [searchQ, setSearchQ] = useState("");
  const [pickOpen, setPickOpen] = useState(false);
  const [pickLoading, setPickLoading] = useState(false);
  const [pickResults, setPickResults] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = searchQ.trim();
    if (q.length < 1) {
      setPickResults([]);
      setPickOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setPickLoading(true);
      try {
        const res = await fetch(
          `/api/contacts?search=${encodeURIComponent(q)}`,
        );
        const data = await res.json();
        setPickResults(data.contacts ?? []);
        setPickOpen(true);
      } finally {
        setPickLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQ]);

  const submitDirect = async () => {
    if (!effectiveBugoId || !selected) return;
    const amt = parseInt(amountInput.replace(/,/g, ""), 10);
    if (!Number.isInteger(amt) || amt < 0) {
      setSaveErr("금액을 올바르게 입력해 주세요.");
      return;
    }
    setSaveBusy(true);
    setSaveErr(null);
    try {
      const res = await fetch("/api/condolence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selected.id,
          bugoRequestId: effectiveBugoId,
          amount: amt,
          note: noteInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "저장에 실패했습니다.");
      }
      setAmountInput("");
      setNoteInput("");
      setSearchQ("");
      setSelected(null);
      await refresh();
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : "오류");
    } finally {
      setSaveBusy(false);
    }
  };

  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkErr, setBulkErr] = useState<string | null>(null);
  const [bulkOk, setBulkOk] = useState<number | null>(null);
  const [bulkFail, setBulkFail] = useState<number | null>(null);
  const [unmatched, setUnmatched] = useState<
    Array<Record<string, unknown>>
  >([]);

  const runBulk = async (file: File) => {
    if (!effectiveBugoId) return;
    setBulkBusy(true);
    setBulkErr(null);
    setUnmatched([]);
    try {
      const fd = new FormData();
      fd.set("bugoRequestId", effectiveBugoId);
      fd.set("file", file);
      const res = await fetch("/api/condolence/bulk", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "업로드에 실패했습니다.");
      }
      setBulkOk(data.matchedCount ?? 0);
      setBulkFail(data.unmatchedCount ?? 0);
      setUnmatched(Array.isArray(data.unmatched) ? data.unmatched : []);
      await refresh();
    } catch (e) {
      setBulkErr(e instanceof Error ? e.message : "오류");
    } finally {
      setBulkBusy(false);
    }
  };

  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");

  const beginEdit = (row: Row, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingContactId(row.contactId);
    setEditAmount(String(row.amount));
    setEditNote(row.note ?? "");
  };

  const cancelEdit = () => {
    setEditingContactId(null);
    setEditAmount("");
    setEditNote("");
  };

  const saveEdit = async (row: Row) => {
    if (!effectiveBugoId) return;
    const amt = parseInt(editAmount.replace(/,/g, ""), 10);
    if (!Number.isInteger(amt) || amt < 0) return;
    const res = await fetch("/api/condolence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: row.contactId,
        bugoRequestId: effectiveBugoId,
        amount: amt,
        note: editNote.trim() || null,
      }),
    });
    if (res.ok) {
      cancelEdit();
      await refresh();
    }
  };

  const avgDisplay = useMemo(() => {
    if (count === 0) return formatKRW(0);
    return formatKRW(Math.round(average));
  }, [average, count]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) void runBulk(f);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void runBulk(f);
    e.target.value = "";
  };

  const modeBtn = (active: boolean) =>
    [
      "flex-1 cursor-pointer rounded-ping border-none py-2.5 px-3 font-inherit text-sm font-semibold",
      active
        ? "bg-ping-primary text-white"
        : "bg-ping-field text-ping-muted",
    ].join(" ");

  return (
    <div className="mypage-body m-0 min-h-dvh bg-ping-bg pb-24 font-ping">
      <div className="mx-auto min-h-dvh max-w-[960px] bg-ping-surface shadow-shell sm:mt-3 sm:rounded-ping-shell">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-black/[0.06] bg-ping-surface/95 px-[18px] py-3.5 shadow-[0_1px_0_rgba(0,0,0,0.06)] backdrop-blur-md">
          <Link
            href="/mypage/points"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ping text-ping-text no-underline [tap-highlight-color:transparent] hover:bg-ping-field"
            aria-label="뒤로"
          >
            <span aria-hidden="true">‹</span>
          </Link>
          <h1 className="m-0 flex-1 text-[17px] font-extrabold tracking-[-0.03em] text-ping-text">
            부의금 정리
          </h1>
        </header>

        <BulkFlowProgress currentStep={9} sticky />

        <nav
          className="flex gap-0 border-b border-black/[0.06] bg-ping-surface px-2.5"
          aria-label="마이페이지 구역"
        >
          <Link href="/mypage" className={tabInactive}>
            시작
          </Link>
          <Link href="/mypage/points" className={tabInactive}>
            혜택 · 포인트
          </Link>
          <Link
            href="/mypage/condolence"
            className={tabActive}
            aria-current="page"
          >
            부의금 정리
          </Link>
        </nav>

        <main className="px-[18px] pb-8 pt-5">
          {!effectiveBugoId ? (
            <div className="mb-4 rounded-ping-lg border border-ping-tint-border bg-ping-tint p-3 text-sm text-ping-muted">
              <label
                htmlFor="bugo-id-input"
                className="mb-2 block text-xs font-bold text-ping-text"
              >
                발송 건 ID (bugoRequestId)
              </label>
              <input
                id="bugo-id-input"
                className="box-border w-full rounded-ping border-none bg-ping-surface px-3 py-2.5 font-inherit text-sm"
                placeholder="URL에 ?bugoRequestId= 를 붙이거나 여기 입력"
                value={bugoRequestId}
                onChange={(e) => setBugoRequestId(e.target.value)}
              />
              <p className="mb-0 mt-2.5 text-xs">
                ID를 입력하면 명단·정산이 표시됩니다.
              </p>
            </div>
          ) : null}

          {loadError ? (
            <p className="mt-2 text-[13px] text-[#e54d2e]">{loadError}</p>
          ) : null}

          <section
            className="mb-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3"
            aria-label="정산 요약"
          >
            <div className="rounded-ping-lg bg-ping-field p-4 shadow-ping-xs">
              <div className="mb-2 text-xs font-semibold tracking-[-0.02em] text-ping-muted">
                총 부의금
              </div>
              <div className="text-xl font-extrabold tracking-[-0.03em] text-ping-text">
                {formatKRW(totalAmount)}
              </div>
            </div>
            <div className="rounded-ping-lg bg-ping-field p-4 shadow-ping-xs">
              <div className="mb-2 text-xs font-semibold tracking-[-0.02em] text-ping-muted">
                인원
              </div>
              <div className="text-xl font-extrabold tracking-[-0.03em] text-ping-text">
                {count}명
              </div>
            </div>
            <div className="rounded-ping-lg bg-ping-field p-4 shadow-ping-xs">
              <div className="mb-2 text-xs font-semibold tracking-[-0.02em] text-ping-muted">
                평균
              </div>
              <div className="text-xl font-extrabold tracking-[-0.03em] text-ping-text">
                {avgDisplay}
              </div>
            </div>
          </section>

          <section className="mb-4 rounded-ping-lg bg-ping-surface p-[18px] shadow-ping-xs">
            <h2 className="mb-3.5 m-0 text-base font-extrabold tracking-[-0.03em]">
              입력
            </h2>
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                className={modeBtn(mode === "direct")}
                onClick={() => setMode("direct")}
              >
                직접 입력
              </button>
              <button
                type="button"
                className={modeBtn(mode === "file")}
                onClick={() => setMode("file")}
              >
                파일 업로드
              </button>
            </div>

            {mode === "direct" ? (
              <>
                <div className="relative mb-3">
                  <input
                    className="box-border w-full rounded-ping border-none bg-ping-field px-3.5 py-3 font-inherit text-sm"
                    placeholder="이름 또는 전화번호로 검색"
                    value={searchQ}
                    onChange={(e) => {
                      setSearchQ(e.target.value);
                      if (!e.target.value.trim()) setSelected(null);
                    }}
                    onFocus={() => {
                      if (pickResults.length) setPickOpen(true);
                    }}
                    disabled={!effectiveBugoId}
                    autoComplete="off"
                  />
                  {pickOpen && searchQ.trim() ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-[220px] overflow-auto rounded-ping-lg bg-ping-surface py-1 shadow-float">
                      {pickLoading ? (
                        <div className="px-3.5 py-2.5 text-sm text-ping-hint">
                          검색 중…
                        </div>
                      ) : pickResults.length === 0 ? (
                        <div className="px-3.5 py-2.5 text-sm text-ping-hint">
                          결과 없음
                        </div>
                      ) : (
                        pickResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="block w-full cursor-pointer border-none bg-transparent px-3.5 py-2.5 text-left font-inherit text-sm text-ping-text hover:bg-ping-field"
                            onClick={() => {
                              setSelected(c);
                              setSearchQ(c.name ?? formatPhoneDisplay(c.phone));
                              setPickOpen(false);
                            }}
                          >
                            {(c.name ?? "이름 없음") +
                              " · " +
                              formatPhoneDisplay(c.phone)}
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
                {selected ? (
                  <p className="mt-2.5 text-sm text-ping-muted">
                    선택:{" "}
                    <strong className="text-ping-text">
                      {selected.name ?? "—"}
                    </strong>{" "}
                    / {formatPhoneDisplay(selected.phone)}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-end gap-2.5">
                  <label className="min-w-[120px] flex-1 text-xs font-semibold text-ping-muted">
                    금액 (원)
                    <input
                      className="mt-1.5 box-border block w-full rounded-ping border-none bg-ping-field px-3 py-2.5 font-inherit text-[15px]"
                      inputMode="numeric"
                      placeholder="예: 50000"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      disabled={!effectiveBugoId}
                    />
                  </label>
                  <label className="min-w-[120px] flex-1 text-xs font-semibold text-ping-muted">
                    메모 (선택)
                    <input
                      className="mt-1.5 box-border block w-full rounded-ping border-none bg-ping-field px-3 py-2.5 font-inherit text-[15px]"
                      placeholder="비고"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      disabled={!effectiveBugoId}
                    />
                  </label>
                  <button
                    type="button"
                    className="cursor-pointer rounded-ping border-none bg-ping-primary px-5 py-3 font-inherit text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={
                      !effectiveBugoId || !selected || saveBusy || loading
                    }
                    onClick={() => void submitDirect()}
                  >
                    저장
                  </button>
                </div>
                {saveErr ? (
                  <p className="mt-2 text-[13px] text-[#e54d2e]">{saveErr}</p>
                ) : null}
              </>
            ) : (
              <>
                <div className="mb-3.5 flex flex-wrap items-center gap-3 gap-x-4">
                  <a
                    className="inline-flex cursor-pointer items-center justify-center rounded-ping border border-ping-tint-border bg-ping-surface px-4 py-2.5 font-inherit text-sm font-bold text-ping-primary no-underline shadow-ping-xs [tap-highlight-color:transparent] hover:bg-ping-tint"
                    href="/api/condolence/template"
                    download
                  >
                    템플릿 다운로드
                  </a>
                  <span className="min-w-[200px] flex-1 text-sm leading-snug text-ping-muted">
                    엑셀 양식을 받아 작성한 뒤 아래에 업로드하세요.
                  </span>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  hidden
                  onChange={handleFileChange}
                />
                <div
                  role="button"
                  tabIndex={0}
                  className={[
                    "cursor-pointer rounded-ping-lg border-2 border-dashed border-black/10 bg-ping-field px-4 py-7 text-center text-sm text-ping-muted",
                    drag ? "border-ping-primary bg-ping-tint" : "",
                  ].join(" ")}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDrag(true);
                  }}
                  onDragLeave={() => setDrag(false)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop}
                  onClick={() => fileRef.current?.click()}
                  onKeyDown={(e: KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileRef.current?.click();
                    }
                  }}
                >
                  {bulkBusy
                    ? "처리 중…"
                    : "CSV 또는 엑셀 파일을 끌어다 놓거나 눌러 선택"}
                  <p className="mb-0 mt-2 text-xs text-ping-hint">
                    컬럼: 이름, 전화번호, 금액(원), 메모(선택)
                  </p>
                </div>
                {bulkErr ? (
                  <p className="mt-2 text-[13px] text-[#e54d2e]">{bulkErr}</p>
                ) : null}
                {bulkOk !== null && bulkFail !== null ? (
                  <div className="mt-3.5 rounded-ping-lg bg-ping-field px-3.5 py-3 text-sm font-semibold text-ping-text">
                    매칭 성공 <span className="text-ping-primary">{bulkOk}건</span>{" "}
                    · 실패{" "}
                    <span className="text-ping-primary">{bulkFail}건</span>
                  </div>
                ) : null}
                {unmatched.length > 0 ? (
                  <>
                    <h3 className="mb-2 mt-5 text-sm font-extrabold">
                      매칭 실패 행
                    </h3>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full border-collapse text-[13px]">
                        <thead>
                          <tr>
                            <th className="border-b border-black/[0.06] px-2 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-ping-hint">
                              행
                            </th>
                            <th className="border-b border-black/[0.06] px-2 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-ping-hint">
                              사유
                            </th>
                            <th className="border-b border-black/[0.06] px-2 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-ping-hint">
                              이름
                            </th>
                            <th className="border-b border-black/[0.06] px-2 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-ping-hint">
                              전화
                            </th>
                            <th className="border-b border-black/[0.06] px-2 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-ping-hint">
                              금액
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {unmatched.map((u, i) => (
                            <tr key={i}>
                              <td className="border-b border-black/[0.06] px-2 py-2.5">
                                {String(u.rowIndex ?? "")}
                              </td>
                              <td className="border-b border-black/[0.06] px-2 py-2.5">
                                {String(u.reason ?? "")}
                              </td>
                              <td className="border-b border-black/[0.06] px-2 py-2.5">
                                {String(u.name ?? "")}
                              </td>
                              <td className="border-b border-black/[0.06] px-2 py-2.5">
                                {String(u.phone ?? "")}
                              </td>
                              <td className="border-b border-black/[0.06] px-2 py-2.5">
                                {String(u.amount ?? "")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : null}
              </>
            )}
          </section>

          <section className="mb-4 rounded-ping-lg bg-ping-surface p-[18px] shadow-ping-xs">
            <h2 className="mb-3.5 m-0 text-base font-extrabold tracking-[-0.03em]">
              부의금 목록
            </h2>
            {loading && items.length === 0 ? (
              <div className="px-6 py-12 text-center text-ping-muted">
                불러오는 중…
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th className="border-b border-black/[0.06] px-2 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-ping-hint">
                        이름
                      </th>
                      <th className="border-b border-black/[0.06] px-2 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-ping-hint">
                        전화번호
                      </th>
                      <th className="border-b border-black/[0.06] px-2 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-ping-hint">
                        금액
                      </th>
                      <th className="border-b border-black/[0.06] px-2 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-ping-hint">
                        메모
                      </th>
                      <th className="border-b border-black/[0.06] px-2 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-ping-hint">
                        수정
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => {
                      const isEd = editingContactId === row.contactId;
                      return (
                        <tr
                          key={row.id}
                          className={
                            isEd
                              ? "cursor-pointer bg-ping-tint hover:bg-ping-tint"
                              : "cursor-pointer hover:bg-black/[0.02]"
                          }
                          onClick={() => {
                            if (!isEd) beginEdit(row);
                          }}
                        >
                          <td className="border-b border-black/[0.06] px-2 py-2.5">
                            {row.contact.name ?? "—"}
                          </td>
                          <td className="border-b border-black/[0.06] px-2 py-2.5">
                            {formatPhoneDisplay(row.contact.phone)}
                          </td>
                          <td className="border-b border-black/[0.06] px-2 py-2.5">
                            {isEd ? (
                              <input
                                className="box-border w-full rounded-md border border-black/[0.08] px-2 py-1.5 font-inherit text-[13px]"
                                inputMode="numeric"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              formatKRW(row.amount)
                            )}
                          </td>
                          <td className="border-b border-black/[0.06] px-2 py-2.5">
                            {isEd ? (
                              <input
                                className="box-border w-full rounded-md border border-black/[0.08] px-2 py-1.5 font-inherit text-[13px]"
                                value={editNote}
                                onChange={(e) => setEditNote(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              row.note ?? "—"
                            )}
                          </td>
                          <td
                            className="border-b border-black/[0.06] px-2 py-2.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isEd ? (
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  className="cursor-pointer rounded-md border-none bg-ping-primary px-2.5 py-1.5 font-inherit text-xs font-semibold text-white"
                                  onClick={() => void saveEdit(row)}
                                >
                                  저장
                                </button>
                                <button
                                  type="button"
                                  className="cursor-pointer rounded-md border-none bg-ping-field px-2.5 py-1.5 font-inherit text-xs font-semibold text-ping-muted"
                                  onClick={cancelEdit}
                                >
                                  취소
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="cursor-pointer border-none bg-transparent px-2.5 py-1.5 font-inherit text-[13px] font-bold text-ping-primary"
                                onClick={(e) => beginEdit(row, e)}
                              >
                                수정
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
