"use client";

import type { BulkRecipientRow } from "@/lib/ping-bulk-recipients";
import { useEffect, useMemo, useState } from "react";
import { StartRecipientStep } from "@/components/start/start-recipient-step";
import "./recipient-exclude-modal.css";

type Props = {
  open: boolean;
  rows: BulkRecipientRow[];
  onClose: () => void;
  onConfirm: (effective: BulkRecipientRow[]) => void;
};

export function RecipientExcludeModal({ open, rows, onClose, onConfirm }: Props) {
  const [excludedPhones, setExcludedPhones] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) {
      setExcludedPhones(new Set());
      setQuery("");
    }
  }, [open, rows]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const sendCount = useMemo(
    () => rows.filter((r) => !excludedPhones.has(r.phone)).length,
    [rows, excludedPhones],
  );
  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      `${row.name || ""} ${row.label || ""} ${row.phone}`.toLowerCase().includes(needle),
    );
  }, [query, rows]);

  if (!open) return null;

  return (
    <div
      className="recipient-exclude-overlay-root"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <StartRecipientStep
        rows={rows}
        visibleRows={visibleRows}
        query={query}
        sendCount={sendCount}
        excludedPhones={excludedPhones}
        onQueryChange={setQuery}
        onTogglePhone={(phone) => {
          setExcludedPhones((prev) => {
            const next = new Set(prev);
            if (next.has(phone)) next.delete(phone);
            else next.add(phone);
            return next;
          });
        }}
        onConfirm={() => {
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
      />
    </div>
  );
}
