"use client";

import { useEffect } from "react";

/**
 * Visual-viewport keyboard inset for sticky/fixed CTAs.
 * Does not change form handlers or wizard state.
 */
export function PingKeyboardInset() {
  useEffect(() => {
    const root = document.documentElement;

    const sync = () => {
      const vv = window.visualViewport;
      if (!vv) {
        root.style.setProperty("--ping-keyboard-inset", "0px");
        return;
      }
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty("--ping-keyboard-inset", `${Math.round(overlap)}px`);
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.matches("input, textarea, select")) return;
      window.setTimeout(() => {
        target.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
        const cta = document.querySelector(
          ".bulk-flow-cta, .checkout-pay-bar, .review-cta-row, .recipient-exclude-sheet__footer, .ping-main .ping-btn-primary",
        );
        if (!(cta instanceof HTMLElement)) return;
        const kb =
          Number.parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue("--ping-keyboard-inset"),
          ) || 0;
        const vis = window.visualViewport?.height ?? window.innerHeight;
        const box = cta.getBoundingClientRect();
        if (box.bottom > vis - Math.max(8, kb * 0.05)) {
          cta.scrollIntoView({ block: "end", inline: "nearest", behavior: "smooth" });
        }
      }, 280);
    };

    sync();
    window.visualViewport?.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      window.visualViewport?.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      document.removeEventListener("focusin", onFocusIn);
      root.style.removeProperty("--ping-keyboard-inset");
    };
  }, []);

  return null;
}
