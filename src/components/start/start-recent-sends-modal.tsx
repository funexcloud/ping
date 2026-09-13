import { formatBulkComposeSavedTs, type BulkRecentSendEntry } from "@/lib/ping-bulk-compose-storage";

type StartRecentSendsModalProps = {
  entries: BulkRecentSendEntry[];
  onClose: () => void;
  onApply: (entry: BulkRecentSendEntry) => void;
};

export function StartRecentSendsModal({ entries, onClose, onApply }: StartRecentSendsModalProps) {
  return (
    <div
      className="ping-start-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="ping-start-overlay__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-recent-sends-title"
      >
        <div className="ping-start-overlay__head">
          <h3 id="bulk-recent-sends-title">최근 발송</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="ping-start-overlay__body">
          {!entries.length ? (
            <p className="ping-start-overlay__empty">
              아직 기록이 없습니다.
              <br />
              주문·결제 저장이 완료되면 여기에 쌓입니다.
            </p>
          ) : (
            <ul>
              {entries.map((item, index) => {
                const count = item.count != null ? `${item.count}건` : "";
                const amount =
                  item.amount != null ? `${Number(item.amount).toLocaleString("ko-KR")}원` : "";
                const extra = [count, amount].filter(Boolean).join(" / ");
                return (
                  <li key={item.id || `r-${index}`}>
                    <div className="ping-start-overlay__meta">
                      {formatBulkComposeSavedTs(item.ts)} · 주문 {String(item.id || "")}
                    </div>
                    <strong>
                      {(item.title || "(제목 없음)").slice(0, 80)}
                      {extra ? ` ${extra}` : ""}
                    </strong>
                    <p>
                      {(item.bodyPreview || "").trim()
                        ? String(item.bodyPreview).slice(0, 140)
                        : "(본문 없음)"}
                    </p>
                    <div className="ping-start-overlay__actions">
                      <button type="button" className="is-primary" onClick={() => onApply(item)}>
                        불러오기
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
