"use client";

import Link from "next/link";
import { ChevronLeft, Inbox } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type PingStoredCustomerInquiry,
  PING_CUSTOMER_INQUIRIES_KEY,
} from "@/lib/ping-customer-inquiries";
import { cn } from "@/lib/utils";

const ADMIN_PASS = "admin123";

function inquiryTypeLabel(type: string): string {
  const m: Record<string, string> = {
    payment: "결제/환불",
    usage: "사용법",
    service: "부가서비스",
    history: "발송 내역 조회",
    other: "기타",
  };
  return m[type] || type;
}

function savedPwKey(id: string): string {
  return `inquiry_${id}_password`;
}

function readInquiries(): PingStoredCustomerInquiry[] {
  try {
    const raw = localStorage.getItem(PING_CUSTOMER_INQUIRIES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as PingStoredCustomerInquiry[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function statusStyle(status: string): string {
  if (status === "대기중") return "bg-[rgba(49,130,246,0.12)] text-[var(--ping-primary)]";
  if (status === "처리중") return "bg-[#fff4e6] text-[#f59e0b]";
  if (status === "완료") return "bg-[#e6f7f0] text-[#10b981]";
  return "bg-[rgba(49,130,246,0.12)] text-[var(--ping-primary)]";
}

export function InquiryBoardClient() {
  const [all, setAll] = useState<PingStoredCustomerInquiry[]>([]);
  const [unlockMap, setUnlockMap] = useState<Record<string, boolean>>({});
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [mode, setMode] = useState<"list" | "detail">("list");
  const [selected, setSelected] = useState<PingStoredCustomerInquiry | null>(null);
  const [modalId, setModalId] = useState<string | null>(null);
  const [modalPw, setModalPw] = useState("");

  const recomputeUnlock = useCallback((list: PingStoredCustomerInquiry[]) => {
    const m: Record<string, boolean> = {};
    for (const i of list) {
      try {
        m[i.id] = localStorage.getItem(savedPwKey(i.id)) === i.password;
      } catch {
        m[i.id] = false;
      }
    }
    setUnlockMap(m);
  }, []);

  const refresh = useCallback(() => {
    let list = readInquiries();
    list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setAll(list);
    recomputeUnlock(list);
  }, [recomputeUnlock]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (i) => i.title.toLowerCase().includes(q) || i.content.toLowerCase().includes(q),
    );
  }, [all, searchTerm]);

  const toggleAdmin = () => {
    const p = window.prompt("관리자 비밀번호를 입력하세요:");
    if (p === null) return;
    if (p === ADMIN_PASS) {
      setIsAdmin((v) => !v);
      setMode("list");
      setSelected(null);
      refresh();
    } else {
      window.alert("비밀번호가 올바르지 않습니다.");
    }
  };

  const openInquiry = (inq: PingStoredCustomerInquiry) => {
    if (!isAdmin && !unlockMap[inq.id]) {
      setModalId(inq.id);
      setModalPw("");
      return;
    }
    setSelected(inq);
    setMode("detail");
    if (!isAdmin) {
      localStorage.setItem(savedPwKey(inq.id), inq.password);
      setUnlockMap((prev) => ({ ...prev, [inq.id]: true }));
    }
  };

  const confirmModal = () => {
    if (!modalId) return;
    const pw = modalPw.trim();
    if (!pw) {
      window.alert("비밀번호를 입력해주세요.");
      return;
    }
    const inq = all.find((i) => i.id === modalId);
    if (inq && inq.password === pw) {
      localStorage.setItem(savedPwKey(modalId), pw);
      setUnlockMap((prev) => ({ ...prev, [modalId]: true }));
      setModalId(null);
      setModalPw("");
      setSelected(inq);
      setMode("detail");
    } else {
      window.alert("비밀번호가 올바르지 않습니다.");
    }
  };

  const backToList = () => {
    setMode("list");
    setSelected(null);
    refresh();
  };

  const updateStatus = (id: string, status: string) => {
    const list = readInquiries();
    const ix = list.findIndex((i) => i.id === id);
    if (ix === -1) return;
    list[ix] = { ...list[ix], status, updatedAt: new Date().toISOString() };
    localStorage.setItem(PING_CUSTOMER_INQUIRIES_KEY, JSON.stringify(list));
    setSelected(list[ix]);
    refresh();
  };

  const deleteInquiry = (id: string) => {
    if (!isAdmin) {
      window.alert("관리자만 삭제할 수 있습니다.");
      return;
    }
    const inq = all.find((i) => i.id === id);
    if (!inq) return;
    if (!window.confirm(`"${inq.title}" 문의를 정말 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) return;
    const next = readInquiries().filter((i) => i.id !== id);
    localStorage.setItem(PING_CUSTOMER_INQUIRIES_KEY, JSON.stringify(next));
    localStorage.removeItem(savedPwKey(id));
    window.alert("문의가 삭제되었습니다.");
    backToList();
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput);
  };

  return (
    <div className="min-h-dvh bg-[#f9fafb] font-ping text-[#191f28] antialiased">
      <header className="sticky top-0 z-20 border-b border-[#e5e8eb] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1000px] items-center justify-between px-6">
          <Link href="/products/ping" className="inline-flex items-center gap-2" aria-label="PING 홈">
            <img src="/ping_logo_svg.svg" alt="PING" className="h-7 w-auto" />
          </Link>
          <Link href="/customer-center" className="text-sm font-semibold text-[#6b7684] hover:text-[var(--ping-primary)]">
            고객센터
          </Link>
        </div>
      </header>

      <section className="px-6 py-10 text-center">
        <div className="mx-auto max-w-[1000px]">
          <h1 className="mb-4 text-[2rem] font-extrabold">1:1 문의</h1>
          <p className="text-base text-[#6b7684]">문의하신 내용을 확인하실 수 있습니다.</p>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="mx-auto max-w-[1000px]">
          {mode === "list" ? (
            <>
              <div className="mb-6 rounded-xl border border-[#e5e8eb] bg-white p-6">
                <form onSubmit={onSearch} className="mb-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="flex-1 rounded-lg border border-[#d1d6db] px-4 py-3 text-[15px] outline-none focus-visible:border-[var(--ping-primary)] focus-visible:ring-2 focus-visible:ring-[rgba(49,130,246,0.2)]"
                    placeholder="문의 제목 또는 내용으로 검색"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-[var(--ping-primary)] px-6 py-3 font-semibold text-white hover:opacity-95"
                  >
                    검색
                  </button>
                </form>
                <div className="border-t border-[#e5e8eb] pt-4">
                  <button
                    type="button"
                    onClick={toggleAdmin}
                    className={cn(
                      "rounded-lg px-5 py-2.5 text-sm font-semibold transition",
                      isAdmin
                        ? "bg-[var(--ping-primary)] text-white"
                        : "bg-[#e5e8eb] text-[#4e5968] hover:bg-[#d1d6db]",
                    )}
                  >
                    {isAdmin ? "일반 모드" : "관리자 모드"}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {filtered.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#e5e8eb] bg-white py-16 text-center text-[#8b95a1]">
                    <Inbox className="mx-auto mb-3 size-12 opacity-40" aria-hidden />
                    <p>문의 내역이 없습니다.</p>
                  </div>
                ) : (
                  filtered.map((inq) => {
                    const hasReveal = isAdmin || unlockMap[inq.id];
                    const preview = hasReveal
                      ? inq.content.slice(0, 100) + (inq.content.length > 100 ? "…" : "")
                      : null;
                    return (
                      <button
                        key={inq.id}
                        type="button"
                        onClick={() => openInquiry(inq)}
                        className="w-full cursor-pointer rounded-xl border border-[#e5e8eb] bg-white p-6 text-left transition hover:border-[var(--ping-primary)] hover:shadow-[0_4px_12px_rgba(49,130,246,0.1)]"
                      >
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="mb-2 text-lg font-bold text-[#191f28]">{inq.title}</div>
                            <div className="flex flex-wrap gap-4 text-sm text-[#6b7684]">
                              <span>{inq.name}</span>
                              <span>{inquiryTypeLabel(inq.inquiryType)}</span>
                              {isAdmin ? <span>{inq.email}</span> : null}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "inline-block shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                              statusStyle(inq.status),
                            )}
                          >
                            {inq.status}
                          </span>
                        </div>
                        {hasReveal ? (
                          <p className="mb-3 text-[15px] leading-relaxed text-[#333d4b]">{preview}</p>
                        ) : (
                          <p className="mb-3 text-[15px] italic text-[#8b95a1]">
                            비밀번호를 입력하시면 내용을 확인하실 수 있습니다.
                          </p>
                        )}
                        <p className="text-xs text-[#8b95a1]">{formatDate(inq.createdAt)}</p>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          ) : selected ? (
            <div>
              <button
                type="button"
                onClick={backToList}
                className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-[var(--ping-primary)] hover:underline"
              >
                <ChevronLeft className="size-4" aria-hidden />
                목록으로
              </button>
              <div className="rounded-xl border border-[#e5e8eb] bg-white p-8">
                <DetailBlock label="제목" value={selected.title} />
                <DetailBlock label="문의 유형" value={inquiryTypeLabel(selected.inquiryType)} />
                <DetailBlock label="작성자" value={selected.name} />
                {isAdmin ? (
                  <>
                    <DetailBlock label="이메일" value={selected.email} />
                    <DetailBlock label="연락처" value={selected.phone} />
                  </>
                ) : null}
                <div className="mb-6">
                  <div className="mb-2 text-sm font-semibold text-[#6b7684]">상태</div>
                  <span
                    className={cn(
                      "inline-block rounded-full px-3 py-1 text-sm font-semibold",
                      statusStyle(selected.status),
                    )}
                  >
                    {selected.status}
                  </span>
                </div>
                <DetailBlock label="작성일" value={formatDate(selected.createdAt)} />
                <div className="mb-2 text-sm font-semibold text-[#6b7684]">문의 내용</div>
                <div className="mt-2 whitespace-pre-wrap rounded-lg bg-[#f2f4f6] p-4 text-[16px] leading-relaxed text-[#191f28]">
                  {selected.content}
                </div>

                {isAdmin ? (
                  <>
                    <div className="mt-8">
                      <label className="mb-2 block text-sm font-semibold text-[#6b7684]">상태 변경</label>
                      <select
                        value={selected.status}
                        onChange={(e) => updateStatus(selected.id, e.target.value)}
                        className="w-full max-w-xs rounded-lg border border-[#d1d6db] px-4 py-3 text-[15px] outline-none focus-visible:border-[var(--ping-primary)]"
                      >
                        <option value="대기중">대기중</option>
                        <option value="처리중">처리중</option>
                        <option value="완료">완료</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteInquiry(selected.id)}
                      className="mt-6 rounded-lg bg-red-500 px-6 py-3 font-semibold text-white hover:bg-red-600"
                    >
                      문의 삭제
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {modalId ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pw-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalId(null);
              setModalPw("");
            }
          }}
        >
          <div className="w-full max-w-[400px] rounded-2xl bg-white p-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 id="pw-modal-title" className="mb-4 text-xl font-bold">
              비밀번호 입력
            </h3>
            <input
              type="password"
              value={modalPw}
              onChange={(e) => setModalPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmModal()}
              className="mb-4 w-full rounded-lg border border-[#d1d6db] px-4 py-3 text-[15px] outline-none focus-visible:border-[var(--ping-primary)]"
              placeholder="비밀번호를 입력하세요"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={confirmModal}
                className="flex-1 rounded-lg bg-[var(--ping-primary)] py-3 font-semibold text-white"
              >
                확인
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalId(null);
                  setModalPw("");
                }}
                className="flex-1 rounded-lg bg-[#e5e8eb] py-3 font-semibold text-[#4e5968]"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-6">
      <div className="mb-2 text-sm font-semibold text-[#6b7684]">{label}</div>
      <div className="text-[16px] leading-relaxed text-[#191f28]">{value}</div>
    </div>
  );
}
