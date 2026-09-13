import { Search } from "lucide-react";

import { PingBrandLogo } from "@/components/brand/ping-brand-logo";
import { START_WIZARD_TOTAL_STEPS } from "@/components/start/start-header";
import type { BulkRecipientRow } from "@/lib/ping-bulk-recipients";

type StartRecipientStepProps = {
  rows: BulkRecipientRow[];
  visibleRows: BulkRecipientRow[];
  query: string;
  sendCount: number;
  excludedPhones: Set<string>;
  onQueryChange: (value: string) => void;
  onTogglePhone: (phone: string) => void;
  onConfirm: () => void;
};

export function StartRecipientStep({
  rows,
  visibleRows,
  query,
  sendCount,
  excludedPhones,
  onQueryChange,
  onTogglePhone,
  onConfirm,
}: StartRecipientStepProps) {
  return (
    <div
      className="recipient-exclude-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recipient-exclude-title"
    >
      <header className="recipient-exclude-app-header">
        <PingBrandLogo variant="horizontal" />
        <span>
          <strong>4</strong> / {START_WIZARD_TOTAL_STEPS}
        </span>
      </header>
      <div className="recipient-exclude-sheet__head">
        <h2 id="recipient-exclude-title">연락처</h2>
        <p aria-live="polite">
          내 연락처 <strong>{rows.length.toLocaleString("ko-KR")}</strong>명
        </p>
        <label className="recipient-exclude-search">
          <Search aria-hidden="true" />
          <span className="sr-only">연락처 검색</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="이름 또는 전화번호 검색"
          />
        </label>
      </div>
      <div className="recipient-exclude-sheet__list">
        <ul>
          {visibleRows.map((row) => {
            const included = !excludedPhones.has(row.phone);
            return (
              <li key={row.phone}>
                <label className="recipient-exclude-row ping-mobile-row">
                  <input
                    type="checkbox"
                    className={`ping-mobile-check ${included ? "is-on" : ""}`}
                    checked={included}
                    onChange={() => onTogglePhone(row.phone)}
                  />
                  <span className="ping-mobile-avatar" aria-hidden>
                    {(row.name || row.label || "?").trim().charAt(0)}
                  </span>
                  <span className="recipient-exclude-row__text">
                    <span className="recipient-exclude-row__label ping-mobile-row__name">
                      {row.label}
                    </span>
                    <span className="ping-mobile-row__phone">{row.phone}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="recipient-exclude-sheet__footer">
        <button
          type="button"
          className="recipient-exclude-confirm-btn ping-mobile-cta ob-flow-btn-primary"
          disabled={sendCount < 1}
          onClick={onConfirm}
        >
          {sendCount < 1
            ? "발송 대상 없음"
            : `${sendCount.toLocaleString("ko-KR")}명 선택 · 다음으로`}
        </button>
      </div>
    </div>
  );
}
