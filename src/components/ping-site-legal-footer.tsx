"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

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
              <strong>한국AIBC융합원</strong>
            </p>
            <p className="footer-company-rep-reg">
              <span>
                <strong>대표자:</strong> 송지훈
              </span>
              <span>
                <strong>사업자등록번호:</strong> 225-09-26000
              </span>
            </p>
            <p>
              <strong>통신판매업신고번호:</strong> 2024울산북구0108호
            </p>
            <p>
              <strong>사업장주소:</strong> 울산광역시 중구 해오름5길 24 101호
            </p>
            <p>
              <strong>고객센터:</strong> 052-286-4440
            </p>
            <p className="index-footer-legal-inline-note">
              한국AIBC융합원에서 운영하는 본 사이트의 모든 유료 서비스는
              <br />
              한국AIBC융합원에서 책임지고 제공합니다.
            </p>
            <p className="index-footer-legal-inline-note index-footer-legal-inline-note--hint">
              <strong>민원 담당자:</strong> 송지훈 010-4864-2401
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
        Copyright ⓒ 2026 한국AIBC융합원. All rights reserved.
      </p>
    </div>
  );
}
