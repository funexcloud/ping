import { PING_COMPANY_LEGAL } from "@/lib/ping-company-legal";
import { cn } from "@/lib/utils";

/** 사업자·고지 본문 — `PingSiteLegalFooter`·마케팅 푸터 공통 */
export function PingCompanyLegalFooterBody({ className }: { className?: string }) {
  return (
    <div className={cn("ping-company-legal-body space-y-1.5 text-[13px] leading-relaxed text-[var(--mkt-sub,#6b7684)]", className)}>
      <p>
        <strong className="text-[var(--mkt-text,#191f28)]">{PING_COMPANY_LEGAL.legalName}</strong>
      </p>
      <p className="footer-company-rep-reg">
        <span>
          <strong>대표자:</strong> {PING_COMPANY_LEGAL.representative}
        </span>
        <span>
          <strong>사업자등록번호:</strong> {PING_COMPANY_LEGAL.businessRegistrationNumber}
        </span>
      </p>
      <p>
        <strong>통신판매업신고번호:</strong> {PING_COMPANY_LEGAL.mailOrderReportNumber}
      </p>
      <p>
        <strong>사업장주소:</strong> {PING_COMPANY_LEGAL.address}
      </p>
      <p>
        <strong>고객센터:</strong> {PING_COMPANY_LEGAL.customerServicePhone}
      </p>
      <p className="ping-company-legal-note">
        {PING_COMPANY_LEGAL.paidServiceNoticeLines[0]}
        <br />
        {PING_COMPANY_LEGAL.paidServiceNoticeLines[1]}
      </p>
      <p className="ping-company-legal-note ping-company-legal-note--hint">
        <strong>민원 담당자:</strong> {PING_COMPANY_LEGAL.complaintContact}
      </p>
    </div>
  );
}
