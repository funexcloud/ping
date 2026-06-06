import type { ReactNode } from "react";

/**
 * /start 위저드 — 첫 페인트부터 단색 캔버스·원스크린 클래스 적용(네비·본문 플래시 완화).
 */
export default function StartLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html:
            "(function(){try{document.documentElement.classList.add('ping-one-screen');}catch(_){}})();",
        }}
      />
      {children}
    </>
  );
}
