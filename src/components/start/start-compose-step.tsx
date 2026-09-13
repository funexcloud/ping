import type { RefObject } from "react";

import { cn } from "@/lib/utils";
import {
  BULK_COMPOSE_HELP,
  BULK_SMS_BODY_MAX_BYTES,
  BULK_SMS_TITLE_MAX_CHARS,
  BULK_THANKYOU_COMPOSE_HELP,
  type BulkSmsTemplateId,
} from "@/lib/ping-bulk-sms";
import type { BulkComposeImage } from "@/lib/ping-bulk-compose-image";

const BULK_COMPOSE_BODY_PLACEHOLDER =
  "이곳에 문자 내용을 입력합니다\n치환문구 예시) #{이름}님, 부고 안내드립니다. 본문에 {{LINK}} 를 넣으면 부고 주소로 바뀝니다.";

const BULK_THANKYOU_BODY_PLACEHOLDER =
  "이곳에 답례 문자를 입력합니다.\n#{이름} 을 넣으면 수신자 이름으로 바뀝니다.\n부고 발송 후 받은 명단 엑셀을 그대로 올리면 됩니다.";

type StartComposeStepProps = {
  isThankYouFlow: boolean;
  title: string;
  body: string;
  bodyBytes: number;
  tplOpen: boolean;
  tplWrapRef: RefObject<HTMLDivElement | null>;
  composeImage: BulkComposeImage | null;
  composeImageInputRef: RefObject<HTMLInputElement | null>;
  titleInputClassName: string;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onComposeKeyDown: (event: React.KeyboardEvent) => void;
  onToggleTpl: () => void;
  onPickTemplate: (id: BulkSmsTemplateId) => void;
  onPickComposeImageFile: (files: FileList | null) => void;
  onSaveComposeDraft: () => void;
  onOpenSavedCompose: () => void;
  onOpenRecentSends: () => void;
  onRemoveComposeImage: () => void;
};

export function StartComposeStep({
  isThankYouFlow,
  title,
  body,
  bodyBytes,
  tplOpen,
  tplWrapRef,
  composeImage,
  composeImageInputRef,
  titleInputClassName,
  onTitleChange,
  onBodyChange,
  onComposeKeyDown,
  onToggleTpl,
  onPickTemplate,
  onPickComposeImageFile,
  onSaveComposeDraft,
  onOpenSavedCompose,
  onOpenRecentSends,
  onRemoveComposeImage,
}: StartComposeStepProps) {
  return (
    <section
      className="ping-start__body ping-start-step bulk-compose-step"
      aria-label={isThankYouFlow ? "답례 문자메세지" : "부고 문자메세지"}
    >
      <input
        ref={composeImageInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => onPickComposeImageFile(event.target.files)}
      />

      <div className="ping-start-step__head">
        <h2 className="ping-start-step__title">{isThankYouFlow ? "답례 메시지" : "부고 메시지"}</h2>
        <p className="ping-start-step__sub">
          전달할 내용을 확인하고
          <br />
          필요하면 수정하세요.
        </p>
      </div>

      <div
        className="index-bulk-compose ping-start-compose"
        aria-label={isThankYouFlow ? "답례 문자메세지 작성" : "부고 문자메세지 작성"}
      >
        <div className="index-bulk-compose-title-wrap">
          <label className="sr-only" htmlFor="bulk-sms-title">
            제목(선택)
          </label>
          <input
            id="bulk-sms-title"
            type="text"
            maxLength={BULK_SMS_TITLE_MAX_CHARS}
            autoComplete="off"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className={titleInputClassName}
            placeholder="제목 (선택 사항)"
            aria-describedby="index-bulk-compose-help-text"
          />
          <span className="index-bulk-compose-title-count" aria-hidden="true">
            {title.length} / {BULK_SMS_TITLE_MAX_CHARS}
          </span>
        </div>

        <div className="index-bulk-compose-body-shell ping-start-compose__editor">
          <div className="index-bulk-compose-textarea-wrap">
            <label className="sr-only" htmlFor="bulk-sms-body">
              문자 본문
            </label>
            <textarea
              id="bulk-sms-body"
              value={body}
              onChange={(event) => onBodyChange(event.target.value)}
              onKeyDown={onComposeKeyDown}
              spellCheck={false}
              rows={8}
              className="index-bulk-compose-textarea"
              placeholder={isThankYouFlow ? BULK_THANKYOU_BODY_PLACEHOLDER : BULK_COMPOSE_BODY_PLACEHOLDER}
            />
          </div>

          <div className="index-bulk-compose-toolbar ping-start-compose__tools">
            <div className="index-bulk-compose-toolbar-left">
              <div className="index-bulk-tpl-wrap" ref={tplWrapRef}>
                <button
                  type="button"
                  className="index-bulk-toolbar-icon-btn"
                  id="bulk-tpl-trigger"
                  aria-label="템플릿 선택"
                  aria-expanded={tplOpen}
                  aria-haspopup="true"
                  aria-controls="bulk-tpl-menu"
                  onClick={onToggleTpl}
                >
                  <i className="fas fa-file-lines" aria-hidden="true" />
                  <span>템플릿</span>
                </button>
                <div
                  id="bulk-tpl-menu"
                  className={tplOpen ? "index-bulk-tpl-menu" : "index-bulk-tpl-menu hidden"}
                  role="menu"
                  aria-label="문구 템플릿"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="index-bulk-tpl-opt"
                    data-template="1"
                    onClick={() => onPickTemplate("1")}
                  >
                    템플릿 1
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="index-bulk-tpl-opt"
                    data-template="2"
                    onClick={() => onPickTemplate("2")}
                  >
                    템플릿 2
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="index-bulk-toolbar-icon-btn"
                title="이미지 첨부 (JPEG으로 압축 저장)"
                aria-label="이미지 첨부"
                onClick={() => composeImageInputRef.current?.click()}
              >
                <i className="fas fa-image" aria-hidden="true" />
                <span>이미지</span>
              </button>
              <button
                type="button"
                className="index-bulk-toolbar-icon-btn"
                title="이 브라우저에 임시 저장"
                aria-label="임시 저장"
                onClick={onSaveComposeDraft}
              >
                <i className="fas fa-floppy-disk" aria-hidden="true" />
                <span>임시저장</span>
              </button>
              <button
                type="button"
                className="index-bulk-toolbar-text-btn"
                title="이 기기에 저장한 문자 불러오기"
                onClick={onOpenSavedCompose}
              >
                <i className="fas fa-folder-open" aria-hidden="true" />
                <span>저장내용</span>
              </button>
              <button
                type="button"
                className="index-bulk-toolbar-text-btn"
                title="주문·결제 기록에서 문구 참고"
                onClick={onOpenRecentSends}
              >
                <i className="fas fa-clock-rotate-left" aria-hidden="true" />
                <span>최근발송</span>
              </button>
            </div>
            <div className="index-bulk-compose-toolbar-right">
              <span
                id="bulk-byte-count-wrap"
                className={cn("index-bulk-byte-count", bodyBytes > BULK_SMS_BODY_MAX_BYTES && "is-over-limit")}
              >
                <span id="bulk-sms-byte-len">{bodyBytes.toLocaleString("en-US")}</span> /{" "}
                {BULK_SMS_BODY_MAX_BYTES.toLocaleString("en-US")} Bytes
              </span>
              <button
                type="button"
                className="index-bulk-compose-help"
                id="bulk-compose-help"
                title="도움말"
                aria-label="문자 작성 도움말"
                onClick={() => window.alert(isThankYouFlow ? BULK_THANKYOU_COMPOSE_HELP : BULK_COMPOSE_HELP)}
              >
                ?
              </button>
            </div>
          </div>

          {composeImage ? (
            <div className="bulk-compose-image-preview">
              <div className="bulk-compose-image-preview-inner">
                <img
                  src={composeImage.dataUrl}
                  alt="첨부 이미지 미리보기"
                  className="bulk-compose-image-thumb"
                />
                <div className="bulk-compose-image-meta">
                  <span className="bulk-compose-image-name">{composeImage.name || "첨부 이미지"}</span>
                  <button
                    type="button"
                    className="bulk-compose-image-remove"
                    aria-label="첨부 이미지 제거"
                    onClick={onRemoveComposeImage}
                  >
                    제거
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <p id="index-bulk-compose-help-text" className="sr-only">
          {isThankYouFlow
            ? "본문은 UTF-8 기준 2,000바이트까지 입력할 수 있습니다. #{이름}은 발송 시 수신자 이름으로 바뀝니다."
            : "본문은 UTF-8 기준 2,000바이트까지 입력할 수 있습니다. {{LINK}}는 발송 시 부고 주소로 바뀝니다."}
        </p>
      </div>
    </section>
  );
}
