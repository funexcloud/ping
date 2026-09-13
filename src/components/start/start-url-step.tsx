import Link from "next/link";
import { FilePenLine } from "lucide-react";

import { PingLoadingSpinner } from "@/components/ping-loading-spinner";
import { PING_CUSTOMER_CENTER_PATH } from "@/lib/ping-obituary-import-trust";
import { cn } from "@/lib/utils";

type StartUrlStepProps = {
  url: string;
  urlHint: string | null;
  urlDomainBlock: string | null;
  urlImportLoading: boolean;
  urlPassOverlayVisible: boolean;
  canUrlNext: boolean;
  urlInputClassName: string;
  onUrlInput: (raw: string) => void;
  onUrlBlur: () => void;
  onUrlPaste: (event: React.ClipboardEvent<HTMLInputElement>) => void;
  onChooseObituaryWrite: () => void;
};

export function StartUrlStep({
  url,
  urlHint,
  urlDomainBlock,
  urlImportLoading,
  urlPassOverlayVisible,
  canUrlNext,
  urlInputClassName,
  onUrlInput,
  onUrlBlur,
  onUrlPaste,
  onChooseObituaryWrite,
}: StartUrlStepProps) {
  return (
    <section className="ping-start__body ping-start-step bulk-url-step" aria-label="부고 주소 입력">
      {urlImportLoading ? (
        <div
          className={cn("bulk-url-pass-parse-overlay", urlPassOverlayVisible && "is-visible")}
          aria-busy="true"
          aria-live="polite"
          role="status"
        >
          <div className="bulk-url-pass-parse-inner">
            <PingLoadingSpinner size="lg" label="부고 메시지 작성 중" />
            <p className="bulk-url-pass-parse-text">
              이제 곧 부고 메세지가 작성되요
              <span className="bulk-url-pass-dots" aria-hidden="true">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </p>
          </div>
        </div>
      ) : null}

      <div className="ping-start-step__head">
        <h2 className="ping-start-step__title">부고 정보 불러오기</h2>
        <p className="ping-start-step__sub">
          부고 링크를 붙여넣으면
          <br />
          PING이 발송 내용을 준비합니다.
        </p>
      </div>

      <div className="bulk-url-step__input-wrap">
        <label htmlFor="bulk-entry-zero-url" className="sr-only">
          부고 주소 URL
        </label>
        <input
          id="bulk-entry-zero-url"
          type="text"
          inputMode="url"
          autoComplete="url"
          value={url}
          onChange={(event) => onUrlInput(event.target.value)}
          onBlur={onUrlBlur}
          onPaste={onUrlPaste}
          disabled={urlImportLoading}
          aria-busy={urlImportLoading}
          aria-invalid={urlHint ? true : undefined}
          className={cn(urlInputClassName, canUrlNext && "ping-field-standard--valid")}
          placeholder="https://로 시작하는 부고 주소"
        />
      </div>

      {urlDomainBlock ? (
        <div className="ping-start-alert" role="alert">
          <p>{urlHint}</p>
          <p className="ping-start-alert__meta">{urlDomainBlock}</p>
          <div className="ping-start-alert__actions">
            <a href="tel:0522864440">052-286-4440</a>
            <Link href={PING_CUSTOMER_CENTER_PATH}>고객센터 문의</Link>
          </div>
        </div>
      ) : urlHint ? (
        <p className="ping-start-field-error" role="alert">
          {urlHint}
        </p>
      ) : null}

      <button type="button" className="ping-start-secondary-link" onClick={onChooseObituaryWrite}>
        <FilePenLine aria-hidden="true" />
        부고 링크가 없으면 직접 작성하기
      </button>
    </section>
  );
}
