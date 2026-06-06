"use client";

import Script from "next/script";
import { useEffect } from "react";
import { saasLandingBodyHtml, saasLandingStyles } from "@/content/marketing/saas-landing";

function deploySite() {
  const input = document.getElementById("subdomainInput") as HTMLInputElement | null;
  const btn = document.getElementById("deployBtn") as HTMLButtonElement | null;
  if (!input || !btn) return;
  const val = input.value.trim().toLowerCase();
  if (!val) return;
  btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> 검증 중...';
  btn.classList.add("opacity-70", "cursor-not-allowed");
  btn.disabled = true;
  window.setTimeout(() => {
    const confirmed = window.confirm(
      `[ ${val}.funexcloud.com ] 라우팅이 가능합니다.\n\n해당 도메인으로 격리된 보안 데이터베이스를 할당하시겠습니까?`,
    );
    if (confirmed) {
      window.alert("보안 연결된 관리자 설정 페이지로 이동합니다. (구현 예정)");
    }
    btn.innerHTML = "인프라 프로비저닝";
    btn.classList.remove("opacity-70", "cursor-not-allowed");
    btn.disabled = false;
  }, 1000);
}

export function SaasLandingClient() {
  useEffect(() => {
    document.documentElement.classList.add("dark", "scroll-smooth");
    (window as Window & { deploySite?: () => void }).deploySite = deploySite;
    return () => {
      document.documentElement.classList.remove("dark", "scroll-smooth");
      delete (window as Window & { deploySite?: () => void }).deploySite;
    };
  }, []);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"
      />
      <style dangerouslySetInnerHTML={{ __html: saasLandingStyles }} />
      <div dangerouslySetInnerHTML={{ __html: saasLandingBodyHtml }} />
      <Script src="https://unpkg.com/@phosphor-icons/web" strategy="afterInteractive" />
      <Script src="https://cdn.tailwindcss.com" strategy="afterInteractive" />
      <Script id="saas-tailwind-config" strategy="afterInteractive">
        {`tailwind.config = {
          darkMode: 'class',
          theme: {
            extend: {
              fontFamily: { sans: ['Pretendard', 'sans-serif'] },
              colors: { neutral: { 950: '#030303' } },
              animation: {
                scroll: 'scroll 40s linear infinite',
                'scroll-fast': 'scroll 20s linear infinite',
              },
              keyframes: {
                scroll: {
                  '0%': { transform: 'translateX(0)' },
                  '100%': { transform: 'translateX(calc(-50% - 1rem))' },
                },
              },
            },
          },
        };`}
      </Script>
    </>
  );
}
