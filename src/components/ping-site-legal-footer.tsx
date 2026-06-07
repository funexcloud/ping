"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { PING_COMPANY_LEGAL } from "@/lib/ping-company-legal";
import { useFontAwesomeCdn } from "@/hooks/use-font-awesome-cdn";

const LEGAL_PAGES = [
  { slug: "terms-of-service", icon: "fa-file-contract", label: "이용약관" },
  { slug: "privacy-policy", icon: "fa-user-shield", label: "개인정보처리방침" },
  { slug: "refund-policy", icon: "fa-undo-alt", label: "취소 및 환불정책" },
  {
    slug: "service-payment-guide",
    icon: "fa-credit-card",
    label: "서비스 및 결제 안내",
  },
] as const;

function resolvePingReturnKey(pathname: string): string {
  if (!pathname || pathname === "/") return "start";
  const seg = pathname.replace(/^\//, "").split("/")[0];
  return seg || "start";
}

export function PingSiteLegalFooter() {
  useFontAwesomeCdn();
  const pathname = usePathname() || "/";
  const pingReturn = useMemo(() => resolvePingReturnKey(pathname), [pathname]);

  const legalLinks = useMemo(
    () =>
      LEGAL_PAGES.map((item) => ({
        ...item,
        href: `/legal/${item.slug}?pingReturn=${encodeURIComponent(pingReturn)}`,
      })),
    [pingReturn],
  );

  return (
    <div className="index-footer-legal-stack px-5 pb-2 pt-3">
      <details className="index-footer-accordion" aria-label="상점 정보·약관·고지">
        <summary className="index-footer-accordion-summary touch-manipulation">
          <span>사업자 · 약관</span>
          <span className="index-footer-accordion-chevron" aria-hidden="true">
            <i className="fas fa-chevron-down" />
          </span>
        </summary>
        <div className="index-footer-accordion-panel">
          <div className="index-footer-legal-company-body pt-3 space-y-1.5 text-[13px] text-ping-body leading-relaxed">
            <p>
              <strong>{PING_COMPANY_LEGAL.legalName}</strong>
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
            <p className="index-footer-legal-inline-note">
              {PING_COMPANY_LEGAL.paidServiceNoticeLines[0]}
              <br />
              {PING_COMPANY_LEGAL.paidServiceNoticeLines[1]}
            </p>
            <p className="index-footer-legal-inline-note index-footer-legal-inline-note--hint">
              <strong>민원 담당자:</strong> {PING_COMPANY_LEGAL.complaintContact}
            </p>
          </div>

          <footer className="mt-4 pt-4">
            <nav className="index-footer-legal-nav" aria-label="약관·정책·결제 안내">
              {legalLinks.map((item) => (
                <Link key={item.href} href={item.href} className="touch-manipulation">
                  <i className={`fas ${item.icon}`} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </footer>
        </div>
      </details>

      <p className="index-footer-copyright text-center text-[11px] text-ping-caption px-1 leading-relaxed tracking-tight">
        Copyright ⓒ 2026 {PING_COMPANY_LEGAL.copyrightHolder}. All rights reserved.
      </p>
    </div>
  );
}
