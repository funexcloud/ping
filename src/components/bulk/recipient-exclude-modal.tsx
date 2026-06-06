"use client";

import type { BulkRecipientRow } from "@/lib/ping-bulk-recipients";
import { useEffect, useMemo, useState } from "react";
import "./recipient-exclude-modal.css";

type Props = {
  open: boolean;
  rows: BulkRecipientRow[];
  onClose: () => void;
  onConfirm: (effective: BulkRecipientRow[]) => void;
};

export function RecipientExcludeModal({ open, rows, onClose, onConfirm }: Props) {
  const [excludedPhones, setExcludedPhones] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) setExcludedPhones(new Set());
  }, [open, rows]);

  const sendCount = useMemo(
    () => rows.filter((r) => !excludedPhones.has(r.phone)).length,
    [rows, excludedPhones],
  );

  if (!open) return null;

  return (
    <div
      className="recipient-exclude-overlay-root fixed inset-0 z-[60] flex bg-black/40"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="recipient-exclude-sheet flex max-h-[min(85dvh,640px)] flex-col overflow-hidden bg-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipient-exclude-title"
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[#E9ECF0]" aria-hidden />
        <div className="recipient-exclude-sheet__head shrink-0 px-5 pb-2 pt-3">
          <h2
            id="recipient-exclude-title"
            className="text-[16px] font-bold tracking-tight text-[#191F28]"
          >
            발송 제외할 연락처
          </h2>
          <p className="mt-2 text-[12px] font-semibold text-[#3182F6]" aria-live="polite">
            발송 예정 {sendCount.toLocaleString("ko-KR")}명 · 제외{" "}
            {excludedPhones.size.toLocaleString("ko-KR")}명
          </p>
        </div>
        <div className="recipient-exclude-sheet__list min-h-0 flex-1 overflow-y-auto px-5">
          <ul className="min-w-0 max-w-full divide-y divide-[#E9ECF0]">
            {rows.map((row) => {
              const checked = excludedPhones.has(row.phone);
              return (
                <li key={row.phone} className="min-w-0 max-w-full">
                  <label className="recipient-exclude-row flex cursor-pointer items-center gap-3 py-3 active:bg-[#F8F9FA]">
                    <span className="recipient-exclude-row__label min-w-0 flex-1 text-[14px] leading-snug text-[#191F28]">
                      {row.label}
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold tracking-wide text-[#B0B8C1]">
                      제외
                    </span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 shrink-0 rounded border-[#E9ECF0] text-[#3182F6]"
                      checked={checked}
                      onChange={() => {
                        setExcludedPhones((prev) => {
                          const next = new Set(prev);
                          if (next.has(row.phone)) next.delete(row.phone);
                          else next.add(row.phone);
                          return next;
                        });
                      }}
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="recipient-exclude-sheet__footer shrink-0 border-t border-[#E9ECF0] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            className="recipient-exclude-confirm-btn ob-flow-btn-primary w-full min-h-[52px] touch-manipulation"
            disabled={sendCount < 1}
            onClick={() => {
              const effective = rows
                .filter((r) => !excludedPhones.has(r.phone))
                .map((r) => ({
                  phone: r.phone,
                  label: (r.label || r.phone).trim() || r.phone,
                  ...(r.name ? { name: r.name } : {}),
                }));
              if (effective.length < 1) {
                window.alert(
                  "발송할 연락처가 1명 이상 있어야 합니다.\n제외 체크를 일부 해제해 주세요.",
                );
                return;
              }
              onConfirm(effective);
            }}
          >
            {sendCount < 1
              ? "발송 대상 없음"
              : `선택 완료 (${sendCount.toLocaleString("ko-KR")}명 발송)`}
          </button>
        </div>
      </div>
    </div>
  );
}
