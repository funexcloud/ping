"use client";

import { useEffect } from "react";

const FA_ID = "ping-font-awesome-cdn";
const FA_HREF =
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css";

/** obituary-entry 전용 — 전역 layout 오염 없이 FA 스타일시트 주입 */
export function useFontAwesomeCdn() {
  useEffect(() => {
    if (document.getElementById(FA_ID)) return;
    const link = document.createElement("link");
    link.id = FA_ID;
    link.rel = "stylesheet";
    link.href = FA_HREF;
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, []);
}
