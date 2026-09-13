import type { RefObject } from "react";

type StartContactsImportStepProps = {
  title: string;
  subtitle: string;
  isThankYouFlow: boolean;
  googleContactsLoading: boolean;
  addressbookParsing: boolean;
  showGoogleReviewBadge: boolean;
  addressbookFileInputRef: RefObject<HTMLInputElement | null>;
  onPickGoogleContacts: () => void;
  onPickAddressbookFile: (files: FileList | null) => void;
};

function GoogleGMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function StartContactsImportStep({
  title,
  subtitle,
  isThankYouFlow,
  googleContactsLoading,
  addressbookParsing,
  showGoogleReviewBadge,
  addressbookFileInputRef,
  onPickGoogleContacts,
  onPickAddressbookFile,
}: StartContactsImportStepProps) {
  return (
    <section
      className="ping-start__body ping-start-step bulk-pick-step"
      aria-label={isThankYouFlow ? "답례 명단 올리기" : "연락처 가져오기"}
    >
      <input
        ref={addressbookFileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.vcf,.vcard"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => void onPickAddressbookFile(event.target.files)}
      />

      <div className="ping-start-step__head">
        <h2 className="ping-start-step__title ping-mobile-title">{title}</h2>
        <p className="ping-start-step__sub ping-mobile-count-line">{subtitle}</p>
      </div>

      <div className="ping-start-sources">
        <div className="bulk-pick-source-btn-wrap">
          {showGoogleReviewBadge ? (
            <span className="bulk-pick-source-btn__review-badge" aria-hidden="true">
              Google 심사중
            </span>
          ) : null}
          <button
            type="button"
            className="bulk-pick-source-btn is-primary"
            disabled={googleContactsLoading || addressbookParsing}
            onClick={onPickGoogleContacts}
          >
            <GoogleGMark />
            <span>{googleContactsLoading ? "구글 연락처 가져오는 중…" : "Google 연락처"}</span>
          </button>
        </div>
        <button
          type="button"
          title="CSV, 엑셀(xlsx·xls), VCard(vcf·vcard) 파일을 선택할 수 있습니다."
          aria-label="주소록 파일 선택: CSV, 엑셀 xlsx 또는 xls, VCard vcf 또는 vcard"
          className="bulk-pick-source-btn"
          disabled={addressbookParsing}
          onClick={() => addressbookFileInputRef.current?.click()}
        >
          <i className="fas fa-file-csv" aria-hidden="true" />
          <span>{addressbookParsing ? "파일 분석 중…" : "주소록 파일"}</span>
        </button>
      </div>
    </section>
  );
}
