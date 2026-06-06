import type { ReactNode } from "react";

/**
 * 인트로는 `IntroHtmlClass`가 `useEffect`에서만 `ping-intro-active`를 붙여
 * 첫 페인트에 루트 레이아웃 배경이 잠깐 비치는 문제가 생긴다.
 * 이 스크립트는 파싱 즉시 클래스를 붙여 플래시를 막는다(IntroHtmlClass는 언마운트 시 제거 유지).
 */
export default function IntroLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html:
            "(function(){try{document.documentElement.classList.add('ping-intro-active');}catch(_){}})();",
        }}
      />
      {children}
    </>
  );
}
