import { formatBulkComposeSavedTs, type BulkSavedComposeEntry } from "@/lib/ping-bulk-compose-storage";

type StartSavedComposeModalProps = {
  entries: BulkSavedComposeEntry[];
  onClose: () => void;
  onApply: (entry: BulkSavedComposeEntry) => void;
  onDelete: (id: string) => void;
};

export function StartSavedComposeModal({
  entries,
  onClose,
  onApply,
  onDelete,
}: StartSavedComposeModalProps) {
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
        aria-labelledby="bulk-saved-compose-title"
      >
        <div className="ping-start-overlay__head">
          <h3 id="bulk-saved-compose-title">저장 내용</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="ping-start-overlay__body">
          {!entries.length ? (
            <p className="ping-start-overlay__empty">
              저장된 항목이 없습니다.
              <br />
              「임시 저장」으로 이 기기에 보관할 수 있습니다.
            </p>
          ) : (
            <ul>
              {entries.map((item) => (
                <li key={item.id}>
                  <div className="ping-start-overlay__meta">
                    {formatBulkComposeSavedTs(item.ts)}
                    {item.image?.dataUrl ? " · 이미지 있음" : ""}
                  </div>
                  <strong>{(item.title || "(제목 없음)").slice(0, 80)}</strong>
                  <p>{(item.body || "").trim() ? item.body.slice(0, 140) : "(본문 없음)"}</p>
                  <div className="ping-start-overlay__actions">
                    <button type="button" className="is-primary" onClick={() => onApply(item)}>
                      불러오기
                    </button>
                    <button type="button" onClick={() => onDelete(item.id)}>
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
